import random
import numpy as np
import pandas as pd
import json
import zipfile
import gzip
import pickle
import torch
import string
import os
import csv
import random

import geopandas
from skmob.tessellation import tilers

from math import sqrt, sin, cos, pi, asin

from importlib.machinery import SourceFileLoader

dir_path = os.path.dirname(os.path.realpath(__file__))
model_path = 'models/deepgravity.py'
ffnn = SourceFileLoader('ffnn', os.path.join(dir_path, model_path)).load_module()
    
def _check_base_files(db_dir):
    # tessellation look up: can be eithre tessellation.shp, tessellation.geojson 
    if not (os.path.isfile(db_dir+'/tessellation.shp') or os.path.isfile(db_dir+'/tessellation.geojson')):
        raise ValueError('Tessellation is missing! There must be a file named tessellation.shp or tessellation.geojson')
    if not (os.path.isfile(db_dir+'/output_areas.shp') or os.path.isfile(db_dir+'/output_areas.geojson')):
        raise ValueError('Output areas are missing! There must be a file named output_areas.shp or output_areas.geojson')
    if not (os.path.isfile(db_dir+'/flows.csv')):
        raise ValueError('Flows are missing! There must be a file named flows.csv')

    print('Tessellation, Flows and Output Areas have been found....')    

            
def tessellation_definition(db_dir,name,size):
    if not (os.path.isfile(db_dir+'/tessellation.shp') or os.path.isfile(db_dir+'/tessellation.geojson')):
        tessellation = tilers.tiler.get("squared", base_shape=name, meters=size)
        tessellation.to_file(db_dir+'/tessellation.shp')
    
def load_data(db_dir, tile_id_column, tile_geometry, oa_id_column, oa_geometry, flow_origin_column, flow_destination_column, flow_flows_column, selected_subgroup_cate, recalculate_data = 0):
    # tileid2oa2features2vals
    with open(db_dir+'/processed/' + selected_subgroup_cate + '/tileid2oa2handmade_features.json') as f:
        tileid2oa2features2vals = json.load(f)

    # oa_gdf
    oa_gdf = pd.read_csv(db_dir + '/processed/oa_gdf.csv.gz', dtype={'geo_code': 'str'})

    # flow_df
    flow_df = pd.read_csv(db_dir+'/processed/' + selected_subgroup_cate + '/flows_oa.csv.zip', \
                          dtype={'residence': 'str', 'workplace': 'str'})
    
    # oa2pop
    oa_pop = flow_df.groupby('residence').sum()
    oa2pop = oa_pop.to_dict()['commuters']
    # add oa's with 0 population
    all_oas = set(oa_gdf['geo_code'].values)
    
    oa2pop = {**{o: 1e-6 for o in all_oas}, **oa2pop}

    for k in oa2pop:
        if oa2pop[k] == 0:
            oa2pop[k] = 1e-6
    
    # oa2features, od2flow, oa2centroid
    with open(db_dir+'/processed/' + selected_subgroup_cate + '/oa2features.pkl', 'rb') as f:
        oa2features = pickle.load(f)

    with open(db_dir+'/processed/' + selected_subgroup_cate + '/od2flow.pkl', 'rb') as f:
        od2flow = pickle.load(f)

    with open(db_dir+'/processed/' + '/oa2centroid.pkl', 'rb') as f:
        oa2centroid = pickle.load(f)

    return tileid2oa2features2vals, oa_gdf, flow_df, oa2pop, oa2features, od2flow, oa2centroid


def load_model(fname, device, dim_s=1, dim_hidden=256, lr=5e-6, momentum=0.9, dropout_p=0.0, verbose=True):

    model = ffnn.NN_MultinomialRegression(dim_s, dim_hidden, 'deepgravity',  dropout_p=dropout_p, device=device)
    checkpoint = torch.load(fname, map_location=torch.device("cpu"))
    model.load_state_dict(checkpoint['model_state_dict'])
    return model


def instantiate_model(oa2centroid, oa2features, oa2pop, dim_input, device=torch.device("cpu"), dim_hidden=256, lr=5e-6, momentum=0.9, dropout_p=0.0, verbose=False):

    model = ffnn.NN_MultinomialRegression(dim_input, dim_hidden,  'deepgravity', dropout_p=dropout_p, device=device)

    return model


def earth_distance(lat_lng1, lat_lng2):
    lat1, lng1 = [l*pi/180 for l in lat_lng1]
    lat2, lng2 = [l*pi/180 for l in lat_lng2]
    dlat, dlng = lat1-lat2, lng1-lng2
    ds = 2 * asin(sqrt(sin(dlat/2.0) ** 2 + cos(lat1) * cos(lat2) * sin(dlng/2.0) ** 2))
    return 6371.01 * ds  # spherical earth...