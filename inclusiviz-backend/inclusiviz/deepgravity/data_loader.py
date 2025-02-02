import torch
from typing import Any, Callable, Dict, IO, List, Optional, Tuple, Union
import numpy as np
from numpy.linalg import norm
from importlib.machinery import SourceFileLoader

from . import utils

def my_collate(batch):
    data = [item[0] for item in batch]
    target = [item[1] for item in batch]
    ids = [item[2] for item in batch]
    #target = torch.LongTensor(target)
    return [data, target], ids


class FlowDataset(torch.utils.data.Dataset):
    def __init__(self,
                 attr,
                 list_IDs: List[str],
                 tileid2oa2features2vals: Dict,
                 o2d2flow: Dict,
                 oa2features: Dict,
                 oa2pop: Dict,
                 oa2centroid: Dict,
                 dim_dests: int,
                 frac_true_dest: float, 
                 model: str
                ) -> None:
        'Initialization'
        self.attr = attr
        self.list_IDs = list_IDs
        self.tileid2oa2features2vals = tileid2oa2features2vals
        self.o2d2flow = o2d2flow
        self.oa2features = oa2features
        self.oa2pop = oa2pop
        self.oa2centroid = oa2centroid
        self.dim_dests = dim_dests
        self.frac_true_dest = frac_true_dest
        self.model = model
        self.oa2tile = {oa:tile for tile,oa2v in tileid2oa2features2vals.items() for oa in oa2v.keys()}

    def __len__(self) -> int:
        'Denotes the total number of samples'
        return len(self.list_IDs)

    def get_features(self, oa_origin, oa_destination):
        # oa2features = self.oa2features
        oa2centroid = self.oa2centroid
        pop_o = np.array(self.oa2features[oa_origin][:1])
        pop_d = np.array(self.oa2features[oa_destination][:1])

        demographic_o = np.array(self.oa2features[oa_origin][1:5])
        demographic_inflow_o = np.array(self.oa2features[oa_origin][5:9])
        demographic_inflow_d = np.array(self.oa2features[oa_destination][5:9])
        # print(demographic_inflow_d)
        income_o = np.array(self.oa2features[oa_origin][9:13])
        income_inflow_o = np.array(self.oa2features[oa_origin][13:17])
        income_inflow_d = np.array(self.oa2features[oa_destination][13:17])
        party_inflow_d = np.array(self.oa2features[oa_destination][32:34])
        # print("O: ", self.oa2features[oa_origin])
        # print("D: ", self.oa2features[oa_destination])
        # print(demographic_o, demographic_inflow_d)
        # demographic_cos_sim = np.dot(demographic_o, demographic_inflow_d)/(norm(demographic_o)*norm(demographic_inflow_d))
        # demographic_cos_sim = np.linalg.norm(demographic_o - demographic_inflow_d)
        # income_cos_sim = np.linalg.norm(income_o - income_inflow_d)

        # print("sim", demographic_cos_sim)
        poi_o = np.log1p(self.oa2features[oa_origin][17:29])
        poi_d = np.log1p(self.oa2features[oa_destination][17:29])

        dist_od = utils.earth_distance(oa2centroid[oa_origin], oa2centroid[oa_destination])
        # print(np.concatenate((pop_o, pop_d, poi_o, poi_d, [demographic_cos_sim], [dist_od])))

        if self.attr == "party":
            return np.concatenate((pop_o, pop_d, poi_o, poi_d, income_inflow_d, party_inflow_d, [dist_od]))
        else:
            return np.concatenate((pop_o, pop_d, poi_o, poi_d, demographic_inflow_d, income_inflow_d, [dist_od]))

    def get_flow(self, oa_origin, oa_destination):
        o2d2flow = self.o2d2flow
        try:
            return o2d2flow[oa_origin][oa_destination]
        except KeyError:
            return 0

    def get_destinations(self, oa, size_train_dest, all_locs_in_train_region):
        o2d2flow = self.o2d2flow
        frac_true_dest = self.frac_true_dest
        try:
            true_dests_all = list(o2d2flow[oa].keys())
        except KeyError:
            true_dests_all = []
        size_true_dests = min(int(size_train_dest * frac_true_dest), len(true_dests_all))
        size_fake_dests = size_train_dest - size_true_dests

        true_dests = np.random.choice(true_dests_all, size=size_true_dests, replace=False)
        # print("true_dests", true_dests)
        fake_dests_all = list(set(all_locs_in_train_region) - set(true_dests))
        if size_fake_dests > 0 and len(fake_dests_all) > 0:
            fake_dests = np.random.choice(fake_dests_all, size=size_fake_dests, replace=True)
        elif size_fake_dests > 0 and len(fake_dests_all) == 0:
            fake_dests = np.random.choice(true_dests_all, size=size_fake_dests, replace=True)
        else:
            fake_dests = np.array([])
        # print("true_dests", true_dests, "fake_dests", fake_dests)
        if len(true_dests) + len(fake_dests) < 10:
            print("true_dests", true_dests, "fake_dests", fake_dests)
        dests = np.concatenate((true_dests, fake_dests))
        np.random.shuffle(dests)
        return dests

    def get_X_T(self, origin_locs, dest_locs):
        X, T = [], []
        for en, i in enumerate(origin_locs):
            X += [[]]
            T += [[]]
            for j in dest_locs[en]:
                X[-1] += [self.get_features(i, j)]
                T[-1] += [self.get_flow(i, j)]

        teX = torch.from_numpy(np.array(X)).float()
        teT = torch.from_numpy(np.array(T)).float()
        return teX, teT

    def __getitem__(self, index: int) -> Tuple[Any, Any]:

        tileid2oa2features2vals = self.tileid2oa2features2vals
        dim_dests = self.dim_dests
        oa2tile = self.oa2tile

        # Select sample (tile)
        sampled_origins = [self.list_IDs[index]]
        tile_ID = oa2tile[sampled_origins[0]]

        # all_locs_in_train_region = list(tileid2oa2features2vals[tile_ID].keys())
        all_locs_in_train_region = self.list_IDs
        size_train_dest = dim_dests
        # size_train_dest = 5
        
        sampled_dests = [self.get_destinations(oa, size_train_dest, all_locs_in_train_region)
                         for oa in sampled_origins]
        # print(sampled_origins, sampled_dests)
        sampled_trX, sampled_trT = self.get_X_T(sampled_origins, sampled_dests)


        return sampled_trX, sampled_trT, sampled_origins

    def __getitem_tile__(self, index: int) -> Tuple[Any, Any]:
        'Generates one sample of data (one tile)'

        tileid2oa2features2vals = self.tileid2oa2features2vals
        dim_dests = self.dim_dests
        tile_ID = self.list_IDs[index]
        sampled_origins = list(tileid2oa2features2vals[tile_ID].keys())

        # Select a subset of OD pairs
        train_locs = sampled_origins
        all_locs_in_train_region = train_locs
        size_train_dest = min(dim_dests, len(all_locs_in_train_region))
        sampled_dests = [self.get_destinations(oa, size_train_dest, all_locs_in_train_region)
                         for oa in sampled_origins]

        # get the features and flows
        sampled_trX, sampled_trT = self.get_X_T(sampled_origins, sampled_dests)

        return sampled_trX, sampled_trT

