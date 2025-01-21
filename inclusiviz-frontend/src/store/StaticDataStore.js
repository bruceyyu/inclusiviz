import { makeAutoObservable } from "mobx";

import HoustonGeoJson from "./Houston_geo.json";
import communityMembership from "./community_membership.json";
import communityFlow from "./community_flow.json";
import communitySignature from "./community_signature.json";
import modelFeature from "./model_feature.json";

import UserDataStore from "./UserDataStore";

class StaticDataStore {
  constructor() {
    makeAutoObservable(this);
  }
  communityMembership = communityMembership;
  communityFlow = communityFlow;
  communitySignature = communitySignature;
  communityModularity = 0.6180;
  allCbgFeature = null;
  selectedCbgNeighbors = [];
  selectedCbgWhatIfNeighbors = []; // [{GEOID: String, outflow_prop_after: Number}]
  selectedCbgWhatIfSegregation = null; // {inflow_prop_list: Number[], segregation_index: Number}
  selectedCbgFeature = null; // {feature_names: String[], feature_values: Number[], original_feature_values: Number[], ss_mean: Number[], ss_var: Number[]}
  selectedCbgSHAP = [];
  selectedCbgWhatIfSHAP = null;
  disagreeSHAPIndices = [];
  selectedCbgCPC = null;
  subgroupList = [];
  whatIfSnapshots = {};
  geoCenterCoord = { lng: -95.397502, lat: 29.787073 };
  geoJson = HoustonGeoJson;
  modelFeature = modelFeature;

  get getCommunityMembership() {
    return this.communityMembership;
  }
  setCommunityMembership = (data) => {
    this.communityMembership = data;
  };
  get getCommunityFlow() {
    return this.communityFlow;
  }
  setCommunityFlow = (data) => {
    this.communityFlow = data;
  };
  get getCommunitySignature() {
    return this.communitySignature;
  }
  setCommunitySignature = (data) => {
    this.communitySignature = data;
  };
  get getCommunityModularity() {
    return this.communityModularity;
  }
  setCommunityModularity = (data) => {
    this.communityModularity = data;
  };

  get getAllCbgFeature() {
    return this.allCbgFeature;
  }
  setAllCbgFeature = (data) => {
    this.allCbgFeature = data;
  };
  get getSelectedCbgNeighbors() {
    return this.selectedCbgNeighbors;
  }
  setSelectedCbgNeighbors = (data) => {
    this.selectedCbgNeighbors = data;
  };
  get getSelectedCbgWhatIfNeighbors() {
    return this.selectedCbgWhatIfNeighbors;
  }
  setSelectedCbgWhatIfNeighbors = (data) => {
    this.selectedCbgWhatIfNeighbors = data;
  };
  get getSelectedCbgWhatIfSegregation() {
    return this.selectedCbgWhatIfSegregation;
  }
  setSelectedCbgWhatIfSegregation = (data) => {
    this.selectedCbgWhatIfSegregation = data;
  };
  get getSelectedCbgFeature() {
    return this.selectedCbgFeature;
  }
  setSelectedCbgFeature = (data) => {
    this.selectedCbgFeature = data;
  };
  get getWhatIfSnapshots() {
    return this.whatIfSnapshots;
  }

  setSelectedCbgSHAP = (data) => {
    this.selectedCbgSHAP = data;
  };
  get getSelectedCbgSHAP() {
    return this.selectedCbgSHAP;
  }
  setSelectedCbgWhatIfSHAP = (data) => {
    this.selectedCbgWhatIfSHAP = data;
  }
  get getSelectedCbgWhatIfSHAP() {
    return this.selectedCbgWhatIfSHAP;
  }
  setDisagreeSHAPIndices = (data) => {
    this.disagreeSHAPIndices = data;
  };
  get getDisagreeSHAPIndices() {
    return this.disagreeSHAPIndices;
  }
  setSubgroupList = (data) => {
    this.subgroupList = data;
  }
  get getSubgroupList() {
    return this.subgroupList;
  }
  setSelectedCbgCPC = (data) => {
    this.selectedCbgCPC = data;
  };
  get getSelectedCbgCPC() {
    return this.selectedCbgCPC;
  }

  setWhatIfSnapshotsByKey = (geoid, data) => {
    if (this.whatIfSnapshots[geoid]) {
      this.whatIfSnapshots[geoid] = data;
    }
    this.whatIfSnapshots = { ...this.whatIfSnapshots };
  };
  setCurrStatusByWhatIfSnapshots = (geoid, snapshotIdx) => {
    const snapshot = this.whatIfSnapshots[geoid][snapshotIdx];
    if (!snapshot) return;
    this.whatIfSnapshots[geoid].splice(snapshotIdx, 1);
    this.setWhatIfSnapshotsByKey(geoid, this.whatIfSnapshots[geoid]);
    this.setSelectedCbgWhatIfSegregation(snapshot.segregation);
    UserDataStore.setSelectedCbgFeatureWhatIf(snapshot.feature);
    this.setSelectedCbgWhatIfNeighbors(snapshot.neighbors);
  };
  resetCurrStatus = () => {
    UserDataStore.setSelectedCbgFeatureWhatIf({});
    this.setSelectedCbgWhatIfSegregation(null);
    this.setSelectedCbgWhatIfNeighbors([]);
  };
  deleteOneWhatIfSnapshotByKey = (geoid, snapshotIdx) => {
    this.whatIfSnapshots[geoid].splice(snapshotIdx, 1);
    this.setWhatIfSnapshotsByKey(geoid, this.whatIfSnapshots[geoid]);
  };

  setWhatIfSnapshotsByCurrStatus = () => {
    const geoid = UserDataStore.getSelectedCbg;
    if (!this.selectedCbgWhatIfSegregation) return;
    if (!this.whatIfSnapshots[geoid]) {
      this.whatIfSnapshots[geoid] = [];
    }
    const snapshot = {
      segregation: this.selectedCbgWhatIfSegregation,
      neighbors: this.selectedCbgWhatIfNeighbors,
      feature: UserDataStore.getSelectedCbgFeatureWhatIf,
    };

    this.whatIfSnapshots[geoid].unshift(snapshot);
    this.resetCurrStatus();
  };

  get getGeoJson() {
    return this.geoJson;
  }
  setGeoJson = (data) => {
    this.geoJson = data;
  };
  get getGeoCenterCoord() {
    return this.geoCenterCoord;
  }
  setGeoCenterCoord(data) {
    this.geoCenterCoord = data;
  }

  get getModelFeature() {
    return this.modelFeature;
  }
  setModelFeature = (data) => {
    this.modelFeature = data;
  };
}

export default new StaticDataStore();
