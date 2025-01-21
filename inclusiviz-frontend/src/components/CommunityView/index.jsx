import { useState, useEffect, useRef, useMemo } from "react";
import { Select, Tooltip, Slider, Button } from "antd";
import CommunitySignature from "./CommunitySignature";
import Matrix from "./Matrix";
import * as globalData from "@/data.global";

import StaticDataStore from "@/store/StaticDataStore";
import UserDataStore from "@/store/UserDataStore";

import { getCommunitiesApi } from "@/api";

import { observer } from "mobx-react-lite";
import "./index.css";

const communityColors = globalData.CLUSTER_COLOR_LIST;
const attributeLegend = globalData.ATTRIBUTE_LEGEND;

const CommunityView = observer(() => {
  const componentRef = useRef(null);
  const [componentWidth, setComponentWidth] = useState(0);
  useEffect(() => {
    const handleResize = () => {
      if (componentRef.current) {
        setComponentWidth(componentRef.current.offsetWidth);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const signatureDict = StaticDataStore.getCommunitySignature;

  const flowMatByAgg = StaticDataStore.getCommunityFlow.flow_mat_by_agg;
  const [selectedFlowAgg, setSelectedFlowAgg] = useState("mean");
  const flowMat = useMemo(() => {
    return flowMatByAgg[selectedFlowAgg];
  }, [flowMatByAgg, selectedFlowAgg]);

  const flowPropMatDictByAttr =
    StaticDataStore.getCommunityFlow.flow_prop_mat_by_attr;
  const selectedAttr = UserDataStore.getSelectedAttr;

  const sortedSignatureDict = useMemo(() => {
    if (!signatureDict || !signatureDict[selectedAttr]) return {};
    let newDict = {};
    newDict[selectedAttr] = signatureDict[selectedAttr];
    Object.keys(signatureDict).forEach((attr) => {
      if (attr !== selectedAttr) {
        newDict[attr] = signatureDict[attr];
      }
    });
    return newDict;
  }, [signatureDict, selectedAttr]);
  const flowPropMatDict = useMemo(() => {
    if (!flowPropMatDictByAttr || !flowPropMatDictByAttr[selectedAttr])
      return {};
    return flowPropMatDictByAttr[selectedAttr];
  }, [flowPropMatDictByAttr, selectedAttr]);

  const cellWidth = useMemo(() => {
    if (
      !flowMat ||
      !Array.isArray(flowMat) ||
      flowMat.length === 0 ||
      componentWidth === 0
    )
      return 0;
    return (componentWidth - 2.5 * 16) / flowMat.length;
  }, [componentWidth, flowMat]);

  return (
    <div ref={componentRef}>
      <div className="flex justify-between">
        <div className="view-label">Community View</div>
        <div className="selected-legend-box">
          {attributeLegend[selectedAttr].map((legend, idx) => (
            <div
              className="selected-legend"
              style={{
                width: 100 / attributeLegend[selectedAttr].length + "%",
              }}
              key={idx}
            >
              <div className="caption">{legend}</div>
              {idx < attributeLegend[selectedAttr].length - 1 ? (
                <div className="divider" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <div className="my-2">
        <div className="flex mb-2">
          <div className="mx-2">
            <span>City: </span>
            <Select
              options={[
                { value: "Houston", label: "Houston" },
                { value: "Boston", label: "Boston" }
              ]}
              value={UserDataStore.getSelectedCity}
              onChange={(e) => UserDataStore.setSelectedCity(e)}
              size="small"
            />
          </div>{" "}
          <div className="mx-2">
            <span>Selected attribute: </span>
            <Select
              options={[
                { value: "race", label: "race" },
                { value: "income", label: "income" },
                { value: "party", label: "party" },
              ]}
              value={selectedAttr}
              onChange={(e) => UserDataStore.setSelectedAttr(e)}
              size="small"
            />
          </div>
        </div>
        <div className="flex justify-between mx-2">
          <span className="self-center">Flow threshold for community: </span>
          <Slider
            min={0}
            max={1000}
            step={10}
            style={{ width: "10rem" }}
            value={UserDataStore.getCommunityFlowThreshold}
            onChange={(value) => UserDataStore.setCommunityFlowThreshold(value)}
          />
          <Button
            size="small"
            className="self-center"
            onClick={() => getCommunitiesApi()}
          >
            Run algo
          </Button>
        </div>
        <div className="mx-2">
          <span>
            Flow aggregation (logged, base <i>e</i>):{" "}
          </span>
          <Select
            options={[
              { value: "mean", label: "mean" },
              { value: "median", label: "median" },
              { value: "sum", label: "sum" },
              { value: "std", label: "std" },
            ]}
            style={{ width: "5rem" }}
            value={selectedFlowAgg}
            onChange={(e) => setSelectedFlowAgg(e)}
            size="small"
          />
        </div>
      </div>
      <div>
        {Object.keys(sortedSignatureDict).map((attr, attrIdx) => (
          <div className="flex" key={attrIdx}>
            <div>
              <Tooltip
                title={
                  <img
                    src={`/community_signature_legend_${attr}.png`}
                    style={{ width: "10rem" }}
                  />
                }
              >
                <div style={{ width: "2.5rem", fontSize: "0.8rem" }}>
                  <img src="/question-circle.svg" className="w-3 float-right" />
                  <div>{attr}</div>
                </div>
              </Tooltip>
            </div>
            {sortedSignatureDict[attr].map((data, index) => {
              return (
                <div
                  key={index}
                  style={{
                    width: cellWidth * 0.7,
                    marginInline: cellWidth * 0.15,
                  }}
                >
                  <CommunitySignature
                    data={data}
                    mainColor={
                      index < signatureDict[attr].length - 1
                        ? communityColors[index]
                        : "gray"
                    }
                    cellWidth={cellWidth * 0.7}
                    cellHeight={cellWidth * 0.8}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div>
        <Matrix
          flowMat={flowMat}
          flowPropMatDict={flowPropMatDict}
          cellWidth={cellWidth}
        />
      </div>
    </div>
  );
});

export default CommunityView;
