from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler
import json
import igraph as ig
from collections import defaultdict
import networkx as nx
import leidenalg as la

from .deepgravity.what_if import WhatIf
from .app import MyAppConfig

attr_list_map = {
    "race": ["white", "black", "asian", "hispanic"],
    "income": ["Under $50K", "$50K - $100K", "$100K - $200K", "Over $200K"],
}
city_center_map = {
    "Houston": { "lng": -95.397502, "lat": 29.787073 },
    "Boston": { "lng": -71.057083, "lat": 42.361145 }
}

def calculate_statistics(column):
    column = column.dropna()
    q1 = np.percentile(column, 25)
    median = np.median(column)
    q3 = np.percentile(column, 75)
    max_val = np.max(column)
    min_val = np.min(column)
    return q1, median, q3

@require_http_methods(["POST"])
@csrf_exempt
def get_geo(request):
    parameter = json.loads(request.body)
    try:
        city = parameter['city']
        attr = parameter['attr']
    except:
        return HttpResponseBadRequest('parameters not correct')

    with open(f"./data/{city}_geo.json", "r") as file:
        geo_data = json.load(file)
    with open(f"./data/{city}_feature_list.json", "r") as file:
        model_feature_data = json.load(file)
    res = {
        "geojson": geo_data,
        "center": city_center_map[city],
        "model_feature_data": model_feature_data
    }
    return JsonResponse(res)

@require_http_methods(["POST"])
@csrf_exempt
def set_attr(request):
    parameter = json.loads(request.body)
    try:
        attr = parameter['attr']
        city = parameter['city']
    except:
        return HttpResponseBadRequest('parameters not correct')
    
    MyAppConfig.set_what_if_obj_attr(attr, city)

    return JsonResponse({"error": False})

@require_http_methods(["POST"])
@csrf_exempt
def get_communities(request):
    parameter = json.loads(request.body)
    try:
        city = parameter['city']
        threshold = int(parameter['threshold'])
        if threshold < 0 or threshold > 1000:
            threshold = 100
    except:
        return HttpResponseBadRequest('parameters not correct')
    feature_df = pd.read_csv(f'./data/{city}_feature_df.csv', dtype={"GEOID":str}).fillna(0)
    adj_df = pd.read_csv(f'./data/{city}_adj_df.csv')
    adj_df = adj_df.set_index(adj_df.columns)

    # community detection
    membership_dict = dict(zip(range(len(feature_df)), [-1 for i in range(len(feature_df))]))
    adj_df_filtered = adj_df[adj_df > threshold].fillna(0)
    G_ig_mob = ig.Graph.Weighted_Adjacency(adj_df_filtered.sort_index(axis=1).sort_index(axis=0))
    part = la.find_partition(G_ig_mob, la.ModularityVertexPartition, seed=42)
    membership = part.membership
    comm_dict = defaultdict(list)
    for idx, comm in enumerate(membership):
        comm_dict[comm].append(idx)
    communities = comm_dict.values()
    comm_size_threshold = sorted([len(comm) for comm in communities], reverse=True)[min(10, len(communities)-1)]
    selected_comm_list = [comm for comm in communities if len(comm) > comm_size_threshold]

    for idx, comm in enumerate(selected_comm_list):
        for cbg in comm:
            membership_dict[cbg] = idx
    
    # community flow by agg
    feature_df["comm"] = range(0, len(feature_df))
    feature_df["comm"] = feature_df["comm"].map(membership_dict)
    comm_map = feature_df[["GEOID", "comm"]].set_index("GEOID")["comm"].to_dict()
    edge_df = adj_df.stack().reset_index()
    edge_df.columns = ['GEOID', 'target', 'weight']
    edge_df = edge_df[edge_df['weight'] != 0]
    edge_df["source_comm"] = edge_df["GEOID"].astype(str).map(comm_map)
    edge_df["target_comm"] = edge_df["target"].astype(str).map(comm_map)
    comm_edge_df = edge_df[(edge_df["target_comm"] != -1) & (edge_df["source_comm"] != -1)]

    flow_mat_by_agg_dict  = {}
    for agg_func in ["mean", "sum", "count", "median", "std"]:
        flow_matrix = comm_edge_df.pivot_table(index='source_comm', columns='target_comm', values='weight', aggfunc=agg_func)
        summary_row = comm_edge_df.pivot_table(columns='target_comm', values='weight', aggfunc=agg_func)
        summary_col = comm_edge_df.pivot_table(index='source_comm', values='weight', aggfunc=agg_func)
        summary_all = comm_edge_df.agg({"weight": agg_func})
        whole_pivot_df = pd.concat([pd.concat([flow_matrix, summary_col], ignore_index=True, axis=1), summary_row], ignore_index=True)
        whole_pivot_df[len(whole_pivot_df) - 1].iloc[len(whole_pivot_df) - 1] = summary_all
        log_whole_pivot_df = whole_pivot_df.applymap(np.log)
        flow_mat_by_agg_dict[agg_func] = log_whole_pivot_df.replace({np.nan: None}).values.tolist()

    # community flow by agg
    comm_edge_df = comm_edge_df.join(feature_df.set_index("GEOID"), on="GEOID")

    flow_prop_mat_by_attr_dict = {}
    for attr_type, attr_list in attr_list_map.items():
        cate_mat_dict = {}
        cate_prop_mat_dict = {}
        for cate in attr_list:
            cate_proportions = comm_edge_df[cate]
            comm_edge_df['weight_cate'] = comm_edge_df['weight'] * cate_proportions

            cate_mat = comm_edge_df.pivot_table(index='source_comm', columns='target_comm', values='weight_cate', aggfunc='sum', fill_value=0)
            summary_row = comm_edge_df.pivot_table(columns='target_comm', values='weight_cate', aggfunc='sum', fill_value=0)
            summary_col = comm_edge_df.pivot_table(index='source_comm', values='weight_cate', aggfunc='sum', fill_value=0)
            summary_all = comm_edge_df.agg({"weight_cate": 'sum'})
            whole_cate_mat = pd.concat([pd.concat([cate_mat, summary_col], ignore_index=True, axis=1), summary_row], ignore_index=True)
            whole_cate_mat[len(whole_cate_mat) - 1].iloc[len(whole_cate_mat) - 1] = summary_all
            cate_mat_dict[cate] = whole_cate_mat
        for cate, mat in cate_mat_dict.items():
            cate_prop_mat_dict[cate] = (mat / sum(cate_mat_dict.values())).replace({np.nan: None}).values.tolist()
        flow_prop_mat_by_attr_dict[attr_type] = cate_prop_mat_dict

    # community signature
    comm_signature_dict = {}
    for attr_type, attr_list in attr_list_map.items():
        comm_data_list = []
        communities = set(feature_df["comm"])
        communities.add("all")
        for comm in communities:
            if comm == -1: continue
            transformed_data = []
            for col in attr_list:
                if comm == "all":
                    selected_feature_df = feature_df
                else:
                    selected_feature_df = feature_df[feature_df["comm"] == comm]
                q1, median, q3 = calculate_statistics(selected_feature_df[col])
                transformed_data.append({
                    'category': col,
                    'q1': q1,
                    'median': median,
                    'q3': q3
                })
            comm_data_list.append(transformed_data)
        comm_signature_dict[attr_type] = comm_data_list

    res = {
        "community_membership": comm_map, "flow": {"flow_mat_by_agg": flow_mat_by_agg_dict, "flow_prop_mat_by_attr": flow_prop_mat_by_attr_dict}, "community_signature": comm_signature_dict, "modularity": part.modularity
    }
    return JsonResponse(res)


@require_http_methods(["POST"])
@csrf_exempt
def get_k_neighbors(request):
    parameter = json.loads(request.body)
    try:
        city = parameter['city']
        geoid = parameter['GEOID']
        attr = parameter['attr']
        k = int(parameter['k'])
    except:
        return HttpResponseBadRequest('parameters not correct')
    
    feature_df = pd.read_csv(f'./data/{city}_feature_df.csv', dtype={"GEOID":str}).fillna(0)
    adj_df = pd.read_csv(f'./data/{city}_adj_df.csv')
    adj_df = adj_df.set_index(adj_df.columns)

    coordinates = feature_df[['LATITUDE', 'LONGITUDE']].to_numpy()
    k = min(40, k)
    neighbors = NearestNeighbors(n_neighbors=k+1)
    neighbors.fit(coordinates)

    row = feature_df[feature_df["GEOID"] == geoid].iloc[0]
    _, indices = neighbors.kneighbors([row[['LATITUDE', 'LONGITUDE']]])
    closest_cbgs = feature_df.iloc[indices[0]]['GEOID'].tolist()
    sub_df = feature_df[feature_df['GEOID'].isin(closest_cbgs)]

    sub_df["outflow_to_target"] = adj_df.loc[sub_df["GEOID"]][geoid].values
    sub_df["total_outflow"] = adj_df.loc[sub_df['GEOID']].sum(axis=1).values
    sub_df["outflow_prop"] = np.cbrt(sub_df["outflow_to_target"] / sub_df["total_outflow"])
    sub_df["attr_value"] = sub_df.apply(lambda row: dict(zip(attr_list_map[attr], row[attr_list_map[attr]].to_list())), axis=1)
    sub_df["total_population_log"] = np.log(sub_df["total_outflow"])
    sub_df["total_population"] = (sub_df["total_population_log"] - sub_df["total_population_log"].min()) / (sub_df["total_population_log"].max() - sub_df["total_population_log"].min()) * 0.5 + 0.5

    neighbors_dict = sub_df[["GEOID", "LATITUDE", "LONGITUDE", "attr_value", "outflow_prop", "total_population"]].to_dict(orient="records")

    res = {
        "neighbors": neighbors_dict
    }
    return JsonResponse(res)

@require_http_methods(["POST"])
@csrf_exempt
def get_all_cbg_knn_feature(request):
    parameter = json.loads(request.body)
    try:
        city = parameter['city']
        attr = parameter['attr']
        k = int(parameter['k'])
    except:
        return HttpResponseBadRequest('parameters not correct')
    
    feature_df = pd.read_csv(f'./data/{city}_feature_df.csv', dtype={"GEOID":str}).fillna(0)
    adj_df = pd.read_csv(f'./data/{city}_adj_df.csv')
    adj_df = adj_df.set_index(adj_df.columns)
    inflow_feature_df = feature_df.copy()
    inflow_feature_df["inflow_total"] = adj_df[inflow_feature_df.GEOID.tolist()].sum(axis=0).values

    coordinates = feature_df[['LATITUDE', 'LONGITUDE']].to_numpy()
    neighbors = NearestNeighbors(n_neighbors=k+1)
    neighbors.fit(coordinates)
    knn_res_mat = neighbors.kneighbors(feature_df[['LATITUDE', 'LONGITUDE']])[1]

    def calc_diversity(prop_list):
        abs_case = 1/len(prop_list) * (len(prop_list) - 1) + (1 - 1/len(prop_list))
        return 1 - np.sum(np.abs([i - 1/len(prop_list) for i in prop_list])) / abs_case

    attr_list = attr_list_map[attr]
    neighbor_features = inflow_feature_df.iloc[knn_res_mat.ravel()]
    reshaped_features = neighbor_features.values.reshape(knn_res_mat.shape[0], knn_res_mat.shape[1], -1)

    attr_idx_list = [inflow_feature_df.columns.get_loc(attr) for attr in attr_list]
    total_population_idx = inflow_feature_df.columns.get_loc("total_population")
    attrs = reshaped_features[:, :, attr_idx_list]
    total_populations = reshaped_features[:, :, total_population_idx]

    weighted_sums = np.sum(attrs * total_populations[:, :, None], axis=1)
    total_population_sums = np.sum(total_populations, axis=1)
    prop_list = weighted_sums / total_population_sums[:, None]
    inflow_feature_df[f"{attr}_bridging_prop_list"] = prop_list.tolist()
    inflow_feature_df[f"{attr}_bridging_index"] = [calc_diversity(props) for props in prop_list]

    influx_mat = np.dot(adj_df.loc[inflow_feature_df.GEOID.tolist()][inflow_feature_df.GEOID.tolist()].T, inflow_feature_df[attr_list])
    influx_df = pd.DataFrame(influx_mat, columns=[f"{attr}_{cate}_inflow" for cate in attr_list])
    influx_df = influx_df.div(influx_df.sum(axis=1), axis=0).fillna(0)
    inflow_feature_df[f"{attr}_segregation_index"] = 1 - influx_df.apply(lambda x: calc_diversity(x), axis=1)
    inflow_feature_df[f"{attr}_inflow_prop_list"] = influx_df.apply(lambda x: x.to_list(), axis=1)

    inflow_feature_df = inflow_feature_df[inflow_feature_df["inflow_total"] > 0].reset_index(drop=True)

    # TOPSIS ranking
    x_values = inflow_feature_df[f"{attr}_segregation_index"]
    y_values = inflow_feature_df[f"{attr}_bridging_index"]
    points = [(x, y) for x, y in zip(x_values, y_values)]
    decision_matrix = np.array(points)
    norms = np.linalg.norm(decision_matrix, axis=0)
    normalized_matrix = decision_matrix / norms
    weights = np.array([0.5, 0.5])
    weighted_matrix = normalized_matrix * weights
    ideal_solution = np.max(weighted_matrix, axis=0)
    negative_ideal_solution = np.min(weighted_matrix, axis=0)
    distances_to_ideal = np.sqrt(np.sum((weighted_matrix - ideal_solution)**2, axis=1))
    distances_to_negative_ideal = np.sqrt(np.sum((weighted_matrix - negative_ideal_solution)**2, axis=1))
    closeness_coefficient = distances_to_negative_ideal / (distances_to_ideal + distances_to_negative_ideal)
    ranking = np.argsort(-closeness_coefficient)
    cbg_feature_dict = inflow_feature_df.iloc[ranking].to_dict(orient="records")
    res = {
        "all_cbg_features": cbg_feature_dict
    }
    return JsonResponse(res)

@require_http_methods(["POST"])
@csrf_exempt
def get_cbg_feature(request):
    parameter = json.loads(request.body)
    try:
        city = parameter['city']
        geoid = parameter['GEOID']
    except:
        return HttpResponseBadRequest('parameters not correct')

    model_feature_df = pd.read_csv(f'./data/{city}_model_feature_df.csv', dtype={"GEOID":str})
    destination_feature_list = ["Food", "Shopping", "Work", "Health", "Religious", "Service", "Entertainment", "Grocery", "Education", "Arts/Museum", "Transportation", "Sports", 
                                'white_inflow', 'black_inflow', 'hispanic_inflow', 'asian_inflow', 
                                'Under $50K_inflow', '$50K - $100K_inflow', '$100K - $200K_inflow', 'Over $200K_inflow']
    original_cbg_feature = model_feature_df[model_feature_df["GEOID"] == geoid][destination_feature_list].values[0]
    ss = StandardScaler()
    ss.fit(model_feature_df[destination_feature_list].values)
    transformed_cbg_feature = ss.transform([original_cbg_feature])[0]

    res = {
        "feature_names": destination_feature_list,
        "feature_values": transformed_cbg_feature.tolist(),
        "original_feature_values": original_cbg_feature.tolist(),
        "ss_mean": ss.mean_.tolist(),
        "ss_var": ss.var_.tolist(),
        # "all_features": ss.transform(model_feature_df[destination_feature_list].values).T.tolist()
        "all_features": model_feature_df[destination_feature_list].values.T.tolist()
    }
    return JsonResponse(res)

@require_http_methods(["POST"])
@csrf_exempt
def what_if(request):
    parameter = json.loads(request.body)
    try:
        city = parameter['city']
        geoid = parameter['GEOID']
        attr = parameter['attr']
        feature_idx_list = parameter['feature_idx_list']
        feature_idx_list = [int(idx) for idx in feature_idx_list]
        feature_value_list = parameter['feature_value_list']
        feature_value_list = [float(val) for val in feature_value_list]
        k = int(parameter['k'])
    except:
        return HttpResponseBadRequest('parameters not correct')

    feature_df = pd.read_csv(f'./data/{city}_feature_df.csv', dtype={"GEOID":str}).fillna(0)
    adj_df = pd.read_csv(f'./data/{city}_adj_df.csv')
    adj_df = adj_df.set_index(adj_df.columns)
    inflow_feature_df = feature_df.copy()
    inflow_feature_df["inflow_total"] = adj_df[inflow_feature_df.GEOID.tolist()].sum(axis=0).values
    attr_list = attr_list_map[attr]
    influx_mat = np.dot(adj_df.loc[inflow_feature_df.GEOID.tolist()][inflow_feature_df.GEOID.tolist()].T, inflow_feature_df[attr_list])
    influx_df = pd.DataFrame(influx_mat, columns=[f"{attr}_{cate}_inflow" for cate in attr_list])
    inflow_feature_df[[f"{attr}_{cate}_inflow" for cate in attr_list]] = influx_df

    coordinates = feature_df[['LATITUDE', 'LONGITUDE']].to_numpy()
    neighbors = NearestNeighbors(n_neighbors=k+1)
    neighbors.fit(coordinates)
    row = inflow_feature_df[inflow_feature_df["GEOID"] == geoid].iloc[0]
    _, indices = neighbors.kneighbors([row[['LATITUDE', 'LONGITUDE']]])
    closest_cbgs = inflow_feature_df.iloc[indices[0]]['GEOID'].tolist()

    what_if_obj = MyAppConfig.get_what_if_obj()
    seg_after, influx_prop_list_after, origin_diff_list = what_if_obj.infer_new_segregation(inflow_feature_df, geoid, closest_cbgs, attr, attr_list_map[attr], feature_idx_list, feature_value_list)
    total_shap_values = what_if_obj.get_what_if_shap_values(geoid, closest_cbgs, feature_idx_list, feature_value_list)

    sub_df = feature_df[feature_df['GEOID'].isin(closest_cbgs)]
    sub_df["outflow_to_target"] = adj_df.loc[sub_df["GEOID"]][geoid].values
    sub_df["total_outflow"] = adj_df.loc[sub_df['GEOID']].sum(axis=1).values
    sub_df["outflow_to_target_diff"] = sub_df['GEOID'].map(dict(zip(closest_cbgs, origin_diff_list)))
    sub_df["outflow_to_target_after"] = sub_df["outflow_to_target_diff"] + sub_df["outflow_to_target"]
    sub_df["outflow_prop_after"] = np.cbrt(sub_df["outflow_to_target_after"] / sub_df["total_outflow"])

    res = {
        "new_selected_cbg_data": {
            "segregation_index": seg_after,
            "inflow_prop_list": list(influx_prop_list_after),
            "shap": {
                "shap_values": dict(zip(closest_cbgs, np.transpose(np.array(total_shap_values), (1, 0, 2)).tolist())),
                "shap_mean": np.array(total_shap_values).mean(axis=1).tolist(),
                "shap_std": np.array(total_shap_values).std(axis=1).tolist()
            }
        },
        "new_origin_outflow": sub_df[["GEOID", "outflow_prop_after"]].to_dict(orient="records")
    }
    return JsonResponse(res)

@require_http_methods(["POST"])
@csrf_exempt
def get_shap_values(request):
    parameter = json.loads(request.body)
    try:
        city = parameter['city']
        geoid = parameter['GEOID']
        attr = parameter['attr']
        k = int(parameter['k'])
    except:
        return HttpResponseBadRequest('parameters not correct')
    
    feature_df = pd.read_csv(f'./data/{city}_feature_df.csv', dtype={"GEOID":str}).fillna(0)
    adj_df = pd.read_csv(f'./data/{city}_adj_df.csv')
    adj_df = adj_df.set_index(adj_df.columns)
    inflow_feature_df = feature_df.copy()
    inflow_feature_df["inflow_total"] = adj_df[inflow_feature_df.GEOID.tolist()].sum(axis=0).values
    attr_list = attr_list_map[attr]
    influx_mat = np.dot(adj_df.loc[inflow_feature_df.GEOID.tolist()][inflow_feature_df.GEOID.tolist()].T, inflow_feature_df[attr_list])
    influx_df = pd.DataFrame(influx_mat, columns=[f"{attr}_{cate}_inflow" for cate in attr_list])
    inflow_feature_df[[f"{attr}_{cate}_inflow" for cate in attr_list]] = influx_df

    coordinates = feature_df[['LATITUDE', 'LONGITUDE']].to_numpy()
    neighbors = NearestNeighbors(n_neighbors=k+1)
    neighbors.fit(coordinates)
    row = inflow_feature_df[inflow_feature_df["GEOID"] == geoid].iloc[0]
    _, indices = neighbors.kneighbors([row[['LATITUDE', 'LONGITUDE']]])
    closest_cbgs = inflow_feature_df.iloc[indices[0]]['GEOID'].tolist()

    what_if_obj = MyAppConfig.get_what_if_obj()
    total_shap_values = what_if_obj.get_shap_values(geoid, closest_cbgs)

    disagreement_indices = np.argsort(np.array(total_shap_values).mean(axis=1).std(axis=0))[::-1]  # Indices of features sorted by disagreement (descending)

    cpc = what_if_obj.calc_cpc(geoid, closest_cbgs, adj_df)

    res = {
        "shap": {
            "shap_values": dict(zip(closest_cbgs, np.transpose(np.array(total_shap_values), (1, 0, 2)).tolist())),
            "shap_mean": np.array(total_shap_values).mean(axis=1).tolist(),
            "shap_std": np.array(total_shap_values).std(axis=1).tolist(),
        },
        "attr_list": attr_list,
        "disagreement_indices": disagreement_indices.tolist(),
        "cpc": cpc
    }
    return JsonResponse(res)