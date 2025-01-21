import * as d3 from "d3";
export const COLOR_SCALE = d3
  .scaleLinear()
  .domain([0, 0.25, 0.5, 0.75, 1])
  .range(["#f0e0b8", "#ecc767", "#d87736", "#ba361b"])
  .interpolate(d3.interpolateRgb); // the color scale on map
export const COLOR_NA = "#555555"; // the NA color on map

export const BASE_COLOR = "#7f79b3";
export const BASE_COLOR_DARKER = "#7c7cb4";
export const BASE_COLOR_LIGHTER = "#b0acd0";
export const BASE_COLOR_COMPLEMENT = "#FFC107";
export const BASE_COLOR_LIGHTER_COMPLEMENT = "#CCD0AC";

export const CORR_MATRIX_COLOR_SCALE = d3
  .scaleLinear()
  .domain([-1, 0, 1])
  .range(["#40004b", "#fff", "#00441b"])
  .clamp(true);

export const CLUSTER_COLOR_LIST = [
  "#6acc64",
  "#4878d0",
  "#ee854a",
  "#82c6e2",
  "#8c613c",
  "#956cb4",
  "#d65f5f",
  "#dc7ec0",
  "#d5bb67",
  "#797979",
];

export const CONTINUOUS_COLOR_RANGE = ["rgba(211, 235, 255, 0.5)", "#413F73"];

export const SUBGROUP_COLOR_DICT = {
  major: "#D1BC9A",
  background: "#8B959C",
};

export const MORAN_PCP_COLOR = "#bd7ebe"; // the pcp in param view

export const P_VALUE_COLOR_SCALE = (p) => {
  if (p <= 0.001) {
    return "#98A48F";
  } else if (p > 0.001 && p <= 0.01) {
    return "#A9B59E";
  } else if (p > 0.01 && p <= 0.05) {
    return "#BAC6AD";
  } else if (p > 0.05 && p <= 1) {
    return "#CBD7BC";
  } else {
    return "#ffffff";
  }
};

export const FEATURE_CATE_COLOR = {
  poi: "#8A9A5B",
  race: "#7A9E9F",
  income: "#A09383",
  party: "#A9A9A9",
};

export const FEATURE_FULLNAME = {
  race: "Inflow by race",
  income: "Inflow by income level",
  party: "Inflow by party",
  poi: "POI type",
};

export const normalize = (val, globalMax, globalMin) => {
  return (val - globalMin) / (globalMax - globalMin);
};

export const ATTRIBUTE_LEGEND = {
  income: ["Under $50K", "$50K-$100K", "$100K-$200K", "Over $200K"],
  race: ["White", "Black", "Asian", "Hispanic"],
  party: ["Lean Democrat", "Lean Republican"],
};
