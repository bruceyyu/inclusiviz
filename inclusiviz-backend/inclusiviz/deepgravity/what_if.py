from importlib.machinery import SourceFileLoader
import numpy as np
import torch
torch.set_printoptions(precision=8)
import pandas as pd
from sklearn.preprocessing import StandardScaler
import os
import shap

from . import utils
from . import data_loader as dgd

def calc_diversity(prop_list):
    abs_case = 1/len(prop_list) * (len(prop_list) - 1) + (1 - 1/len(prop_list))
    return 1 - np.sum(np.abs([i - 1/len(prop_list) for i in prop_list])) / abs_case

def cpc(val1, val2):
    return 2.0 * np.sum(np.minimum(val1, val2)) / (np.sum(val1) + np.sum(val2))

class WhatIf:
    def __init__(self, dataset, attr, attr_cate_list):
        self.attr_cate_list = attr_cate_list
        self.dir_path = os.path.dirname(os.path.realpath(__file__))
        self.dataset = dataset
        self.model_type = 'DG'
        # self.db_dir = f'./data/{self.dataset}'
        self.model_dict = {}
        self.all_dataset_dict = {}
        self.ss_dict = {}
        self.explainer_dict = {}

        for selected_subgroup_cate in self.attr_cate_list:
            db_dir = os.path.join(self.dir_path, 'data', self.dataset)
            tileid2oa2features2vals, oa_gdf, flow_df, oa2pop, oa2features, od2flow, oa2centroid = utils.load_data(db_dir,
                                                                                                                'tile_ID',
                                                                                                                'geometry',
                                                                                                                'GEOID',
                                                                                                                'geometry',
                                                                                                                'geoid_o',
                                                                                                                'geoid_d',
                                                                                                                'pop_flows',
                                                                                                                selected_subgroup_cate)
            oa2features = {oa: np.concatenate((np.log([oa2pop[oa]]), feats)) for oa, feats in oa2features.items()}
            o2d2flow = {}
            for (o, d), f in od2flow.items():
                try:
                    d2f = o2d2flow[o]
                    d2f[d] = f
                except KeyError:
                    o2d2flow[o] = {d: f}
            train_data = [oa for t in pd.read_csv(db_dir + '/processed/' + selected_subgroup_cate + '/train_tiles.csv', header=None, dtype=object)[0].values for oa
                        in tileid2oa2features2vals[str(t)].keys()]
            test_data = [oa for t in pd.read_csv(db_dir + '/processed/' + selected_subgroup_cate + '/test_tiles.csv', header=None)[0].values for oa in
                        tileid2oa2features2vals[str(t)].keys()]

            dataset_args = {'tileid2oa2features2vals': tileid2oa2features2vals,
                                    'o2d2flow': o2d2flow,
                                    'oa2features': oa2features,
                                    'oa2pop': oa2pop,
                                    'oa2centroid': oa2centroid,
                                    'dim_dests': 30,
                                    'frac_true_dest': 1,
                                    'model': self.model_type}
            all_dataset = dgd.FlowDataset(attr, train_data + test_data, **dataset_args)
            self.all_dataset_dict[selected_subgroup_cate] = all_dataset

            dim_input = len(all_dataset.get_features(train_data[0], train_data[2]))
            train_features = np.array([all_dataset[i][0][0].numpy() for i in range(len(all_dataset))]).reshape(len(all_dataset) * 30, dim_input)
            ss = StandardScaler()
            ss.fit(train_features)
            self.ss_dict[selected_subgroup_cate] = ss

            device = torch.device("cpu")
            model = utils.load_model(f'{self.dir_path}/results/model_{self.model_type}_{self.dataset}_{selected_subgroup_cate}_log.pt', dim_s=dim_input, device=device)
            self.model_dict[selected_subgroup_cate] = model

            kmeans_feat = np.load(f'{self.dir_path}/results/shap_feat_kmeans/{self.dataset}_{selected_subgroup_cate}_log.npy', allow_pickle=True)
            explainer = shap.DeepExplainer(model, torch.tensor(kmeans_feat))
            self.explainer_dict[selected_subgroup_cate] = explainer

    def get_shap_values(self, target_geoid, origin_geoid_list):
        total_shap_values = []
        for cate_idx, selected_subgroup_cate in enumerate(self.attr_cate_list):
            explainer = self.explainer_dict[selected_subgroup_cate]
            ss = self.ss_dict[selected_subgroup_cate]
            all_dataset = self.all_dataset_dict[selected_subgroup_cate]

            feat, t = all_dataset.get_X_T(origin_geoid_list, [[target_geoid] for _ in range(len(origin_geoid_list))])
            selected_shap_values = explainer.shap_values(torch.tensor(ss.transform(feat[:,0,:].numpy())))
            total_shap_values.append(selected_shap_values.tolist())
        return total_shap_values

    def calc_cpc(self, target_geoid, origin_geoid_list, adj_df):
        np.random.seed(0)
        predicted_visitor = []
        true_visitor = []

        for origin_idx, origin in enumerate(origin_geoid_list):
            visitor_sum = []
            for subgroup, model in self.model_dict.items():
                all_dataset = self.all_dataset_dict[subgroup]
                ss = self.ss_dict[subgroup]
                
                # other_des_list = list(dict(sorted(all_dataset.o2d2flow[origin].items(), key=lambda x: x[1], reverse=True)).keys())[:29]
                other_des_list = list(np.random.choice(list(all_dataset.o2d2flow[origin].keys()), 29))
                # other_des_list = list(dict(sorted(all_dataset.o2d2flow[origin].items(), key=lambda x: x[1], reverse=True)).keys())[:29]
                od_X_T = all_dataset.get_X_T([origin], [other_des_list + [target_geoid]])
                od_feats = od_X_T[0].clone()
                od_target = od_X_T[1].clone()
                before_pred = np.round(model.average_OD_model(torch.from_numpy(np.array([ss.transform(od_feats[0])])).to(torch.float32), od_target), 8)
                # before_pred = np.round(model.average_OD_model(od_feats, od_target), 8)
                
                visitor_sum.append(before_pred[0][-1])
            predicted_visitor.append(sum(visitor_sum))
            true_visitor.append(adj_df.loc[origin][target_geoid])
            
        return cpc(predicted_visitor, true_visitor)

    def get_what_if_shap_values(self, target_geoid, origin_geoid_list, feature_idx_list, feature_value_list):
        feature_idx_offset = 14
        total_shap_values = []
        for cate_idx, selected_subgroup_cate in enumerate(self.attr_cate_list):
            explainer = self.explainer_dict[selected_subgroup_cate]
            ss = self.ss_dict[selected_subgroup_cate]
            all_dataset = self.all_dataset_dict[selected_subgroup_cate]

            feat, t = all_dataset.get_X_T(origin_geoid_list, [[target_geoid] for _ in range(len(origin_geoid_list))])
            feat_before = feat[:,0,:].numpy()
            feat_after = feat_before
            for feature_idx, feature_value in zip(feature_idx_list, feature_value_list):
                feat_after[:,feature_idx + feature_idx_offset] = np.log1p(feature_value)
            selected_shap_values = explainer.shap_values(torch.tensor(ss.transform(feat_after)))
            total_shap_values.append(selected_shap_values.tolist())
        return total_shap_values

    def infer_new_segregation(self, inflow_feature_df, target_geoid, origin_geoid_list, attr_type, attr_list, feature_idx_list, feature_value_list):
        np.random.seed(0)
        # self.model = utils.load_model(f'{self.dir_path}/results/model_{self.model_type}_{self.dataset}_{selected_subgroup_cate}.pt', self.oa2centroid, self.oa2features, self.oa2pop, dim_s=self.dim_input, device=self.device)
        feature_idx_offset = 14
        attr_diff_list = np.zeros(len(attr_list))
        origin_diff_list = np.zeros(len(origin_geoid_list))
        
        for cate_idx, selected_subgroup_cate in enumerate(self.attr_cate_list):
            model = self.model_dict[selected_subgroup_cate]
            all_dataset = self.all_dataset_dict[selected_subgroup_cate]
            ss = self.ss_dict[selected_subgroup_cate]
            all_origin_geoid_list = [o for o in all_dataset.o2d2flow.keys() if target_geoid in  all_dataset.o2d2flow[o].keys()]
            all_origin_flow_list = [all_dataset.o2d2flow[o][target_geoid] for o in all_dataset.o2d2flow.keys() if target_geoid in all_dataset.o2d2flow[o].keys()]

            sorted_origin_geoid_list = [origin for _, origin in sorted(zip(all_origin_flow_list, all_origin_geoid_list), reverse=True)]
            top_30_percent = int(len(sorted_origin_geoid_list) * 0.3)
            all_origin_geoid_list = sorted_origin_geoid_list[:top_30_percent]
            
            # for origin_idx, origin in enumerate(all_origin_geoid_list):
            for origin_idx, origin in enumerate(origin_geoid_list):
                other_des_list = list(dict(sorted(all_dataset.o2d2flow[origin].items(), key=lambda x: x[1], reverse=True)).keys())[:29]
                od_X_T = all_dataset.get_X_T([origin], [other_des_list + [target_geoid]])
                od_feats = od_X_T[0].clone()
                od_target = od_X_T[1].clone()
                before_pred = np.round(model.average_OD_model(torch.from_numpy(np.array([ss.transform(od_feats[0])])).to(torch.float32), od_target), 8)
                for feature_idx, feature_value in zip(feature_idx_list, feature_value_list):
                    od_feats[0][-1][feature_idx + feature_idx_offset] = np.log1p(feature_value)
                after_pred = np.round(model.average_OD_model(torch.from_numpy(np.array([ss.transform(od_feats[0])])).to(torch.float32), od_target), 8)
                origin_diff = (after_pred - before_pred)[0][-1]
                attr_diff_list[cate_idx] += origin_diff
                if origin in origin_geoid_list:
                    origin_idx = origin_geoid_list.index(origin)
                    origin_diff_list[origin_idx] += origin_diff
        seg_after, influx_prop_list_after = self.calc_seg_diff(inflow_feature_df, target_geoid, attr_type, attr_list, attr_diff_list)
        # attr_diff_list = np.zeros(len(attr_list))
        # origin_diff_list = np.zeros(len(origin_geoid_list))
        # for cate_idx, selected_subgroup_cate in enumerate(self.attr_cate_list):
        #     model = self.model_dict[selected_subgroup_cate]
        #     all_dataset = self.all_dataset_dict[selected_subgroup_cate]
        #     for origin_idx, origin in enumerate(origin_geoid_list):
        #         other_des_list = list(dict(sorted(all_dataset.o2d2flow[origin].items(), key=lambda x: x[1], reverse=True)).keys())[:9]
        #         od_X_T = all_dataset.get_X_T([origin], [other_des_list + [target_geoid]])
        #         od_feats = od_X_T[0].clone()
        #         od_target = od_X_T[1].clone()
        #         before_pred = np.round(model.average_OD_model(od_feats, od_target), 0)
        #         for feature_idx, feature_value in zip(feature_idx_list, feature_value_list):
        #             od_feats[0][9][feature_idx + feature_idx_offset] = feature_value
        #         after_pred = np.round(model.average_OD_model(od_feats, od_target), 0)
        #         origin_diff = (after_pred - before_pred)[0][9]
        #         attr_diff_list[cate_idx] += origin_diff
        #         origin_diff_list[origin_idx] += origin_diff
        # seg_after, influx_prop_list_after = self.calc_seg_diff(inflow_feature_df, target_geoid, attr_type, attr_list, attr_diff_list)
        return seg_after, influx_prop_list_after, origin_diff_list
    
    def calc_seg_diff(self, inflow_feature_df, destination, attr_type, attr_list, flow_diff_list):
        inflow_attr_list = [f"{attr_type}_{attr_val}_inflow" for attr_val in attr_list]
        influx_df = inflow_feature_df[inflow_attr_list]
        influx_df_copy = influx_df.copy()
        destination_index = list(inflow_feature_df.GEOID).index(destination)
        for idx, attr_val in enumerate(attr_list):
            influx_df_copy.iloc[destination_index][f"{attr_type}_{attr_val}_inflow"] += flow_diff_list[idx]
        influx_df_before = influx_df.div(influx_df.sum(axis=1), axis=0).fillna(0)
        influx_df_after = influx_df_copy.div(influx_df_copy.sum(axis=1), axis=0).fillna(0)
        influx_prop_list_before = influx_df_before.iloc[destination_index].values
        influx_prop_list_after = influx_df_after.iloc[destination_index].values

        seg_before = 1 - calc_diversity(influx_prop_list_before)
        seg_after = 1 - calc_diversity(influx_prop_list_after)

        return seg_after, influx_prop_list_after
