import axios from "axios";
import UserDataStore from "@/store/UserDataStore";
import StaticDataStore from "@/store/StaticDataStore";

// const ROOT_URL = "https://wwi-questionnaire-v2.azurewebsites.net/api/";
const ROOT_URL = "http://127.0.0.1:8080/";
// const ROOT_URL = "https://a081-185-213-82-131.ngrok-free.app/"

const getMetaSetting = () => {
  return {
    city: UserDataStore.getSelectedCity,
    attr: UserDataStore.getSelectedAttr,
  };
};

export const setNewAttrApi = () => {
  const payload = {
    ...getMetaSetting()
  };
  UserDataStore.setLoadingStatus(true);
  return new Promise((resolve, reject) => {
    axios
      .post(ROOT_URL + "set_attr", payload)
      .then((res) => {
        UserDataStore.setLoadingStatus(false);
      })
  });
};

export const getGeoJsonApi = () => {
  const payload = {
    ...getMetaSetting()
  };
  UserDataStore.setLoadingStatus(true);
  return new Promise((resolve, reject) => {
    axios
      .post(ROOT_URL + "get_geo", payload)
      .then((res) => {
        UserDataStore.setLoadingStatus(false);
        const { data } = res;
        StaticDataStore.setGeoJson(data.geojson);
        StaticDataStore.setGeoCenterCoord(data.center);
        StaticDataStore.setModelFeature(data.model_feature_data);
      })
      .catch((error) => {
        UserDataStore.setLoadingStatus(false);
        reject(error);
      });
  });
};

export const getCommunitiesApi = () => {
  const payload = {
    ...getMetaSetting(),
    GEOID: UserDataStore.getSelectedCbg,
    threshold: UserDataStore.getCommunityFlowThreshold,
  };
  UserDataStore.setLoadingStatus(true);
  return new Promise((resolve, reject) => {
    axios
      .post(ROOT_URL + "get_communities", payload)
      .then((res) => {
        UserDataStore.setLoadingStatus(false);
        const { data } = res;
        StaticDataStore.setCommunityMembership(data.community_membership);
        StaticDataStore.setCommunityFlow(data.flow);
        StaticDataStore.setCommunitySignature(data.community_signature);
        StaticDataStore.setCommunityModularity(data.modularity);
      })
      .catch((error) => {
        UserDataStore.setLoadingStatus(false);
        reject(error);
      });
  });
};

export const getSelectedCbgNeighborsApi = () => {
  const payload = {
    ...getMetaSetting(),
    GEOID: UserDataStore.getSelectedCbg,
    k: UserDataStore.getTopKNeighbors,
  };
  UserDataStore.setLoadingStatus(true);
  return new Promise((resolve, reject) => {
    axios
      .post(ROOT_URL + "get_k_neighbors", payload)
      .then((res) => {
        UserDataStore.setLoadingStatus(false);
        const { data } = res;
        StaticDataStore.setSelectedCbgNeighbors(data.neighbors);
      })
      .catch((error) => {
        UserDataStore.setLoadingStatus(false);
        reject(error);
      });
  });
};

export const getAllCbgFeatureApi = () => {
  UserDataStore.setLoadingStatus(true);
  StaticDataStore.setAllCbgFeature([]);
  return new Promise((resolve, reject) => {
    axios
      .post(ROOT_URL + "get_all_cbg_knn_feature", {
        ...getMetaSetting(),
        k: UserDataStore.getTopKNeighbors,
        attr: UserDataStore.getSelectedAttr,
      })
      .then((res) => {
        UserDataStore.setLoadingStatus(false);
        const { data } = res;
        StaticDataStore.setAllCbgFeature(data.all_cbg_features);
      })
      .catch((error) => {
        UserDataStore.setLoadingStatus(false);
        reject(error);
      });
  });
};

export const getSelectedCbgFeatureApi = () => {
  UserDataStore.setLoadingStatus(true);
  return new Promise((resolve, reject) => {
    axios
      .post(ROOT_URL + "get_cbg_feature", {
        ...getMetaSetting(),
        GEOID: UserDataStore.getSelectedCbg,
      })
      .then((res) => {
        UserDataStore.setLoadingStatus(false);
        const { data } = res;
        StaticDataStore.setSelectedCbgFeature(data);
      })
      .catch((error) => {
        UserDataStore.setLoadingStatus(false);
        reject(error);
      });
  });
};

export const getSelectedCbgSHAPApi = () => {
  UserDataStore.setLoadingStatus(true);
  return new Promise((resolve, reject) => {
    axios
      .post(ROOT_URL + "get_shap_values", {
        ...getMetaSetting(),
        GEOID: UserDataStore.getSelectedCbg,
        k: UserDataStore.getTopKNeighbors,
      })
      .then((res) => {
        UserDataStore.setLoadingStatus(false);
        const { data } = res;
        StaticDataStore.setSelectedCbgSHAP(data.shap);
        StaticDataStore.setSubgroupList(data.attr_list);
        StaticDataStore.setSelectedCbgCPC(data.cpc);
        StaticDataStore.setDisagreeSHAPIndices(data.disagreement_indices);
      })
      .catch((error) => {
        UserDataStore.setLoadingStatus(false);
        reject(error);
      });
  });
};

export const getWhatIfApi = () => {
  UserDataStore.setLoadingStatus(true);
  let featureDict = UserDataStore.getSelectedCbgFeatureWhatIf
  return new Promise((resolve, reject) => {
    axios
      .post(ROOT_URL + "what_if", {
        ...getMetaSetting(),
        GEOID: UserDataStore.getSelectedCbg,
        k: UserDataStore.getTopKNeighbors,
        feature_idx_list: Object.keys(featureDict),
        feature_value_list: Object.values(featureDict),
      })
      .then((res) => {
        UserDataStore.setLoadingStatus(false);
        const { data } = res;
        StaticDataStore.setSelectedCbgWhatIfNeighbors(data.new_origin_outflow);
        StaticDataStore.setSelectedCbgWhatIfSegregation(data.new_selected_cbg_data);
      })
      .catch((error) => {
        UserDataStore.setLoadingStatus(false);
        reject(error);
      });
  });
};
