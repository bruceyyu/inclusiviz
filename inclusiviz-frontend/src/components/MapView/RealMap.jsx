import { useEffect, useRef } from "react";

import StaticDataStore from "@/store/StaticDataStore";
import UserDataStore from "@/store/UserDataStore";
import * as globalData from "@/data.global";
import { observer } from "mobx-react-lite";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

var map;
const communityColors = globalData.CLUSTER_COLOR_LIST;
var geoJsonLayer;

const initBaseMap = (geoCenterCoord) => {
  if (map !== undefined && map !== null) {
    map.off();
    map.remove();
  }
  let container = L.DomUtil.get("graphDiv");
  if (container !== undefined && container !== null) {
    container._leaflet_id = null;
  }
  map = L.map("graphDiv").setView(geoCenterCoord, 11);
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      maxZoom: 19,
      minZoom: 8,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }
  ).addTo(map);
};

const addCommunityLayer = (geoJson, communityMembership) => {
  geoJsonLayer = L.geoJson(geoJson, {
    style: (feature) => {
      const geoId = feature.properties.GEOID; // Adjust property name as needed
      const community = communityMembership[geoId];
      const color = communityColors[community] || "#FFFFFF"; // Default color if community not found
      return {
        color: communityColors[community] || "#FFFFFF",
        weight: 0.8,
        fillColor: color,
        fillOpacity: 0.5,
      };
    },
  }).addTo(map);
};

const updateSelectedCBG = (
  selectedCbg,
  communityMembership,
  neighborNodesList,
  fullMapMode
) => {
  if (!geoJsonLayer || !selectedCbg) return;
  geoJsonLayer.eachLayer((layer) => {
    if (layer.feature.properties.GEOID === selectedCbg) {
      layer.setStyle({
        fillColor: "#000000", // Set color to black
        fillOpacity: 0.8, // Optional: Increase opacity for emphasis
      });
    } else {
      // Optionally reset other CBGs to their original style
      const community = communityMembership[layer.feature.properties.GEOID];
      let color = "#FFFFFF";
      if (
        neighborNodesList.includes(layer.feature.properties.GEOID) ||
        fullMapMode
      ) {
        color = communityColors[community] || "#FFFFFF";
      }
      layer.setStyle({
        fillColor: color,
        color: color,
        fillOpacity: 0.5,
      });
    }
  });
};

const RealMap = observer(() => {
  const geoJson = StaticDataStore.getGeoJson;
  const geoCenterCoord = StaticDataStore.getGeoCenterCoord;
  const communityMembership = StaticDataStore.getCommunityMembership;
  const selectedCbg = UserDataStore.getSelectedCbg;
  const neighborNodesData = StaticDataStore.getSelectedCbgNeighbors;
  const fullMapMode = UserDataStore.getFullMapMode;
  // const prevSelectedCBG = useRef(selectedCbg);

  useEffect(() => {
    initBaseMap(geoCenterCoord);
    addCommunityLayer(geoJson, communityMembership);
  }, [geoJson, geoCenterCoord, communityMembership]);

  useEffect(() => {
    // if (selectedCbg !== prevSelectedCBG.current) {
    updateSelectedCBG(
      selectedCbg,
      communityMembership,
      neighborNodesData.map((ele) => ele.GEOID),
      fullMapMode
    );
    // prevSelectedCBG.current = selectedCbg;
    // }
  }, [selectedCbg, communityMembership, neighborNodesData, fullMapMode]);

  return (
    <div
      id="graphDiv"
      style={{ width: "100%", height: "100%" }}
      className="shadow-lg rounded-lg"
    ></div>
  );
});

export default RealMap;
