import { makeAutoObservable } from "mobx";
import {
  setNewAttrApi,
  getGeoJsonApi,
  getCommunitiesApi,
  getSelectedCbgNeighborsApi,
  getSelectedCbgFeatureApi,
  getSelectedCbgSHAPApi,
  getAllCbgFeatureApi,
} from "@/api";

import StaticDataStore from "./StaticDataStore";

class UserDataStore {
  constructor() {
    makeAutoObservable(this);
  }
  loadingStatus = 0;
  fullMapMode = false;
  communityFlowThreshold = 200;
  selectedCommunity = null;
  selectedCbg = null;
  selectedCity = "Houston";
  selectedAttr = "income";
  selectedCbgFeatureWhatIf = {};
  topKNeighbors = 20;

  selectedNeighborCbgForSHAP = null;
  selectedNeighborSubgroupIdxForSHAP = null;

  get getLoadingStatus() {
    return this.loadingStatus;
  }
  setLoadingStatus(data) {
    if (data) {
      this.loadingStatus += 1;
    } else {
      this.loadingStatus -= 1;
    }
  }

  get getCommunityFlowThreshold() {
    return this.communityFlowThreshold;
  }
  setCommunityFlowThreshold = (data) => {
    this.communityFlowThreshold = data;
  };

  get getSelectedCommunity() {
    return this.selectedCommunity;
  }
  setSelectedCommunity = (data) => {
    this.selectedCommunity = data;
  };

  get getSelectedCbg() {
    return this.selectedCbg;
  }
  setSelectedCbg = (data) => {
    if (this.selectedCbg === data) return;
    if (StaticDataStore.getSelectedCbgWhatIfSegregation) {
      StaticDataStore.setWhatIfSnapshotsByCurrStatus(); // auto save
    }
    this.selectedCbg = data;
    this.selectedCbgFeatureWhatIf = {};
    console.log("selectedCbg", data);
    console.log(StaticDataStore.getAllCbgFeature)
    const selectedCbgData = StaticDataStore.getAllCbgFeature.find(
      (ele) => ele.GEOID === String(data)
    );
    console.log("selectedCbgData", selectedCbgData);
    StaticDataStore.setGeoCenterCoord({
      lng: selectedCbgData.LONGITUDE,
      lat: selectedCbgData.LATITUDE,
    });
    getSelectedCbgNeighborsApi();
    getSelectedCbgFeatureApi();
    getSelectedCbgSHAPApi();
  };

  get getTopKNeighbors() {
    return this.topKNeighbors;
  }
  setTopKNeighbors = (data) => {
    this.topKNeighbors = data;
    getAllCbgFeatureApi();
    if (this.selectedCbg) {
      getSelectedCbgNeighborsApi();
      getSelectedCbgSHAPApi();
    }
  };

  get getFullMapMode() {
    return this.fullMapMode;
  }
  setFullMapMode = (data) => {
    this.fullMapMode = data;
  };

  get getSelectedCity() {
    return this.selectedCity;
  }
  setSelectedCity = (data) => {
    this.selectedCity = data;
    getGeoJsonApi();
    getCommunitiesApi();
    getAllCbgFeatureApi();
    setNewAttrApi();
  };
  get getSelectedAttr() {
    return this.selectedAttr;
  }
  setSelectedAttr = (data) => {
    this.selectedAttr = data;
    getGeoJsonApi();
    getCommunitiesApi();
    getAllCbgFeatureApi();
    setNewAttrApi();
  };

  get getSelectedCbgFeatureWhatIf() {
    return this.selectedCbgFeatureWhatIf;
  }
  setSelectedCbgFeatureWhatIf = (data) => {
    this.selectedCbgFeatureWhatIf = { ...data };
  };
  setSelectedCbgFeatureWhatIfByKey = (key, val) => {
    this.selectedCbgFeatureWhatIf[key] = val;
    this.selectedCbgFeatureWhatIf = { ...this.selectedCbgFeatureWhatIf };
  };

  get getSelectedNeighborCbgForSHAP() {
    return this.selectedNeighborCbgForSHAP;
  }
  setSelectedNeighborCbgForSHAP = (data) => {
    this.selectedNeighborCbgForSHAP = data;
  };
  get getSelectedNeighborSubgroupIdxForSHAP() {
    return this.selectedNeighborSubgroupIdxForSHAP;
  }
  setSelectedNeighborSubgroupIdxForSHAP = (data) => {
    this.selectedNeighborSubgroupIdxForSHAP = data;
  };
}

export default new UserDataStore();
