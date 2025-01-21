import { observer } from "mobx-react-lite";
import { useEffect, useRef, useMemo, useState } from "react";
import { Select, Tooltip, Button } from "antd";
import * as d3 from "d3";
import * as globalData from "@/data.global";
import StaticDataStore from "@/store/StaticDataStore";
import UserDataStore from "@/store/UserDataStore";
import { getWhatIfApi } from "@/api";

function kernelDensityEstimator(kernel, X) {
  return function (V) {
    return X.map((x) => [x, d3.mean(V, (v) => kernel(x - v))]);
  };
}

function kernelEpanechnikov(k) {
  return function (v) {
    return Math.abs((v /= k)) <= 1 ? (0.75 * (1 - v * v)) / k : 0;
  };
}

const WhatIfView = observer(() => {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  const containerRef = useRef(null);
  const shapData = StaticDataStore.getSelectedCbgSHAP;
  const selectedCbg = UserDataStore.getSelectedCbg;
  const allCbgFeature = StaticDataStore.getAllCbgFeature;
  const selectedAttr = UserDataStore.getSelectedAttr;
  const whatIfData = StaticDataStore.getSelectedCbgWhatIfSegregation;
  const disagreeSHAPIndices = StaticDataStore.getDisagreeSHAPIndices;
  const features = StaticDataStore.getModelFeature.filter((ele) =>
    isExpanded ? true : ele.type === "poi"
  );
  const featureNames = features.map((feature) => feature.name);

  const featureSlicer = (data) => {
    if (isExpanded) {
      return data.slice(14, 34);
    } else {
      return data.slice(14, 26);
    }
  };
  const cbgFeature = StaticDataStore.getSelectedCbgFeature;
  const cbgFeatureWhatIf = UserDataStore.getSelectedCbgFeatureWhatIf;
  const subgroupList = StaticDataStore.getSubgroupList;

  const CPC = StaticDataStore.getSelectedCbgCPC;

  const neighborCBG = UserDataStore.getSelectedNeighborCbgForSHAP;
  const neighborSubgroupIdx =
    UserDataStore.getSelectedNeighborSubgroupIdxForSHAP;

  const [sortingMode, setSortingMode] = useState("SORT_BY_MAG");

  const beforeInflowList = useMemo(() => {
    if (selectedCbg && allCbgFeature) {
      const cbg = allCbgFeature.find((ele) => ele.GEOID === selectedCbg);
      if (!cbg) return [];
      return cbg[`${selectedAttr}_inflow_prop_list`];
    }
    return [];
  }, [selectedCbg, allCbgFeature, selectedAttr]);

  const whatIfInflowList = useMemo(() => {
    if (whatIfData) {
      return whatIfData.inflow_prop_list;
    }
    return [];
  }, [whatIfData]);

  const whatIfSHAP = useMemo(() => {
    if (whatIfData) {
      return whatIfData.shap;
    }
    return [];
  }, [whatIfData]);

  useEffect(() => {
    if (shapData.shap_mean && shapData.shap_std) {
      // Clean up the previous SVG content
      d3.select(containerRef.current).selectAll("*").remove();
      const totalMargin = { top: 0, right: 0, bottom: 10, left: 120 };
      const singleMargin = { top: 30, right: 10, bottom: 15, left: 10 };
      const width =
        (containerRef.current.clientWidth - totalMargin.left) /
          shapData.shap_mean.length -
        singleMargin.left -
        singleMargin.right;
      const height =
        containerRef.current.clientHeight -
        singleMargin.top -
        singleMargin.bottom;

      let sortedFeatureNames = [];
      if (sortingMode === "SORT_BY_MAG") {
        const featureSum = featureNames.map((feature, idx) => {
          return shapData.shap_mean.reduce((sum, modelData) => {
            return sum + Math.abs(featureSlicer(modelData)[idx]);
          }, 0);
        });
        const featureSumPairs = featureNames.map((name, idx) => ({
          name: name,
          sum: featureSum[idx],
        }));
        featureSumPairs.sort((a, b) => d3.descending(a.sum, b.sum));
        sortedFeatureNames = featureSumPairs.map((d) => d.name);
      } else if (sortingMode === "SORT_BY_DIFF") {
        disagreeSHAPIndices.forEach((idx) => {
          if (idx >= 14 && idx - 14 < featureNames.length) {
            sortedFeatureNames.push(featureNames[idx - 14]);
          }
        });
      }

      // Define scales
      const yScale = d3
        .scaleBand()
        .domain(sortedFeatureNames)
        .range([0, height])
        .padding(0.2);

      const xRange = Math.max(
        Math.abs(
          d3.min(
            shapData.shap_mean
              .map((ele, modelIdx) =>
                featureSlicer(ele).map(
                  (feat, featIdx) =>
                    feat - featureSlicer(shapData.shap_std[modelIdx])[featIdx]
                )
              )
              .flat()
          )
        ),
        d3.max(
          shapData.shap_mean
            .map((ele, modelIdx) =>
              featureSlicer(ele).map(
                (feat, featIdx) =>
                  feat + featureSlicer(shapData.shap_std[modelIdx])[featIdx]
              )
            )
            .flat()
        )
      );
      const xScaleGlobal = d3
        .scaleLinear()
        .domain([
          // d3.min(shapMeanData.flat()) - d3.max(shapStdData.flat()),
          // d3.max(shapMeanData.flat()) + d3.max(shapStdData.flat()),
          xRange * -1,
          xRange,
        ])
        .nice()
        .range([0, width]);

      // Create container for multiple plots
      const svgContainer = d3
        .select(containerRef.current)
        .attr("width", 4 * (width + singleMargin.left + singleMargin.right))
        .attr("height", height + singleMargin.top + singleMargin.bottom);

      shapData.shap_mean.forEach((modelData, modelIdx) => {
        const xScale = xScaleGlobal;

        const svg = svgContainer
          .append("g")
          .attr(
            "transform",
            `translate(${
              modelIdx * (width + singleMargin.left + singleMargin.right) +
              singleMargin.left +
              totalMargin.left
            },${singleMargin.top + totalMargin.top})`
          );

        // Draw boundary around the plot
        svg
          .append("rect")
          .attr("x", -singleMargin.left) // Extend left beyond the margin
          .attr("y", 0)
          .attr("width", width + singleMargin.left + singleMargin.right) // Full width of the plot
          .attr("height", height + singleMargin.top + singleMargin.bottom) // Full height of the plot
          .attr("fill", "none")
          .attr("stroke", "lightgray")
          .attr("stroke-dasharray", "2,2")
          .attr("stroke-width", 1);

        // Label the positive and negative sides of the plot
        svg
          .append("text")
          .attr("x", xScale(0) + 5) // Position slightly to the right of the vertical line
          .attr("y", 10) // Slightly above the plot
          .style("font-size", "0.7rem")
          .style("text-anchor", "start")
          .text("+");

        svg
          .append("text")
          .attr("x", xScale(0) - 5) // Position slightly to the left of the vertical line
          .attr("y", 10) // Slightly above the plot
          .style("font-size", "0.7rem")
          .style("text-anchor", "end")
          .text("-");

        // Draw y-axis only for the first plot to align all plots
        if (modelIdx === 0) {
          // svg.append("g").call(d3.axisLeft(yScale));
          features.forEach((feature) => {
            if (feature.type === "poi") {
              svg
                .append("image")
                .attr("xlink:href", `/icons/${feature.name}.svg`) // Link to the image
                .attr("x", -40) // Adjust x position (negative to the left of y-axis)
                .attr("y", yScale(feature.name) + yScale.bandwidth() / 2 - 10) // Center the image on the tick
                .attr("width", 20) // Set the width of the image
                .attr("height", 20); // Set the height of the image
            } else {
              svg
                .append("text")
                .attr("x", -35)
                .attr("y", yScale(feature.name) + yScale.bandwidth() / 2)
                .attr("dy", "0.35em")
                .style("font-size", "0.6rem")
                .style("text-anchor", "middle")
                .text(feature.fullname);
            }
          });
        }

        // Draw dots and error bars for each plot
        svg
          .selectAll(`.dot-${modelIdx}`)
          .data(featureSlicer(modelData)) // Assuming this range as per your initial example
          .enter()
          .append("circle")
          .attr("class", `dot-${modelIdx}`)
          .attr("cx", (d) => xScale(d))
          .attr(
            "cy",
            (d, i) => yScale(featureNames[i]) + yScale.bandwidth() / 2
          )
          .attr("r", 3)
          .style("fill", globalData.BASE_COLOR);

        // Add error bars
        svg
          .selectAll(`.error-line-${modelIdx}`)
          .data(featureSlicer(modelData))
          .enter()
          .append("line")
          .attr("class", `error-line-${modelIdx}`)
          .attr("x1", (d, i) =>
            xScale(d - featureSlicer(shapData.shap_std[modelIdx])[i])
          )
          .attr("x2", (d, i) =>
            xScale(d + featureSlicer(shapData.shap_std[modelIdx])[i])
          )
          .attr(
            "y1",
            (d, i) => yScale(featureNames[i]) + yScale.bandwidth() / 2
          )
          .attr(
            "y2",
            (d, i) => yScale(featureNames[i]) + yScale.bandwidth() / 2
          )
          .style("stroke", globalData.BASE_COLOR)
          .style("stroke-width", 1);

        // Draw vertical dotted line at x=0
        svg
          .append("line")
          .attr("class", "vertical-line")
          .attr("x1", xScale(0))
          .attr("x2", xScale(0))
          .attr("y1", 0)
          .attr("y2", height)
          .style("stroke", "black")
          .style("stroke-dasharray", "2,2");

        svg
          .append("text")
          .attr("x", xScale(0))
          .attr("y", height + 5)
          .attr("text-anchor", "middle")
          .style("font-size", "0.7rem")
          .text(subgroupList[modelIdx]);

        if (
          neighborCBG !== undefined &&
          neighborSubgroupIdx !== undefined &&
          neighborSubgroupIdx === modelIdx
        ) {
          const instanceData = featureSlicer(
            shapData.shap_values[neighborCBG][neighborSubgroupIdx]
          );
          const sortedInstanceData = sortedFeatureNames.map((feature) => {
            return instanceData[featureNames.indexOf(feature)];
          });
          const line = d3
            .line()
            .x((d) => xScale(d))
            .y(
              (d, i) => yScale(sortedFeatureNames[i]) + yScale.bandwidth() / 2
            );

          // Draw the line
          svg
            .append("path")
            .datum(sortedInstanceData) // Use instance SHAP values for the line
            .attr("class", "instance-line")
            .attr("d", line)
            .style("fill", "none")
            .style("stroke", globalData.BASE_COLOR)
            .style("stroke-width", 1);
        }

        if (whatIfSHAP && whatIfSHAP.shap_mean && whatIfSHAP.shap_std) {
          svg
            .selectAll(`.what-if-dot-${modelIdx}`)
            .data(featureSlicer(whatIfSHAP.shap_mean[modelIdx])) // Assuming this range as per your initial example
            .enter()
            .append("circle")
            .attr("class", `what-if-dot-${modelIdx}`)
            .attr("cx", (d) => xScale(d))
            .attr(
              "cy",
              (d, i) => yScale(featureNames[i]) + yScale.bandwidth() / 2
            )
            .attr("r", 3)
            .style("fill", globalData.BASE_COLOR_COMPLEMENT);
          svg
            .selectAll(`.what-if-error-line-${modelIdx}`)
            .data(featureSlicer(whatIfSHAP.shap_mean[modelIdx]))
            .enter()
            .append("line")
            .attr("class", `what-if-error-line-${modelIdx}`)
            .attr("x1", (d, i) =>
              xScale(d - featureSlicer(whatIfSHAP.shap_std[modelIdx])[i])
            )
            .attr("x2", (d, i) =>
              xScale(d + featureSlicer(whatIfSHAP.shap_std[modelIdx])[i])
            )
            .attr(
              "y1",
              (d, i) => yScale(featureNames[i]) + yScale.bandwidth() / 2
            )
            .attr(
              "y2",
              (d, i) => yScale(featureNames[i]) + yScale.bandwidth() / 2
            )
            .style("stroke", globalData.BASE_COLOR_COMPLEMENT)
            .style("stroke-width", 1);

          if (
            neighborCBG !== undefined &&
            neighborSubgroupIdx !== undefined &&
            neighborSubgroupIdx === modelIdx
          ) {
            const instanceData = featureSlicer(
              whatIfSHAP.shap_values[neighborCBG][neighborSubgroupIdx]
            );
            const sortedInstanceData = sortedFeatureNames.map((feature) => {
              return instanceData[featureNames.indexOf(feature)];
            });
            const line = d3
              .line()
              .x((d) => xScale(d))
              .y(
                (d, i) => yScale(sortedFeatureNames[i]) + yScale.bandwidth() / 2
              );

            // Draw the line
            svg
              .append("path")
              .datum(sortedInstanceData) // Use instance SHAP values for the line
              .attr("class", "instance-line")
              .attr("d", line)
              .style("fill", "none")
              .style("stroke", globalData.BASE_COLOR_COMPLEMENT)
              .style("stroke-width", 1);
          }
        }

        svg
          .append("rect")
          .attr("class", "flow-rect")
          .attr("x", xScale(0))
          .attr("y", 0)
          .attr("width", 10)
          .attr("height", 40 * beforeInflowList[modelIdx])
          .style("fill", globalData.BASE_COLOR)
          .attr(
            "transform",
            `translate(-5, ${40 * beforeInflowList[modelIdx] * -1})`
          );

        if (whatIfInflowList && whatIfInflowList.length > 0) {
          svg
            .append("rect")
            .attr("class", "after-flow-rect")
            .attr("x", xScale(0))
            .attr("y", 0)
            .attr("width", 5)
            .attr("height", 40 * whatIfInflowList[modelIdx])
            .style("fill", globalData.BASE_COLOR_COMPLEMENT)
            .attr(
              "transform",
              `translate(-2.5, ${40 * whatIfInflowList[modelIdx] * -1})`
            );
        }
      });

      if (cbgFeature && cbgFeature.all_features) {
        featureNames.forEach((feature, featureIdx) => {
          // Extract data for this feature across all models
          const featureDataAcrossModels = cbgFeature.all_features[featureIdx];
          const currFeatureVal = cbgFeature.original_feature_values[featureIdx];

          const logFeatureData = featureDataAcrossModels
            .filter((d) => d > 0)
            .map((d) => Math.log(d));

          // KDE data
          const xScale = d3
            .scaleLinear()
            .domain([d3.min(logFeatureData), d3.max(logFeatureData)])
            .range([0, 60]);

          const kdeX = xScale.ticks(100);
          const kde = kernelDensityEstimator(kernelEpanechnikov(0.7), kdeX);
          const kdeData = kde(logFeatureData);

          // Draw KDE plot on the left
          const kdeSvg = svgContainer
            .append("g")
            .attr(
              "transform",
              `translate(10,${
                singleMargin.top + totalMargin.top + yScale(feature)
              })`
            );

          const kdeYScale = d3
            .scaleLinear()
            .domain([0, d3.max(kdeData, (d) => d[1])])
            .range([15, 0]);

          const kdeLine = d3
            .line()
            .curve(d3.curveBasis)
            .x((d) => xScale(d[0]))
            .y((d) => kdeYScale(d[1]));

          // Create the area generator
          const kdeArea = d3
            .area()
            .curve(d3.curveBasis)
            .x((d) => xScale(d[0]))
            .y1((d) => kdeYScale(d[1])) // Top y value (from kde data)
            .y0(kdeYScale(0)); // Bottom y value (from 0)

          // Append the area to the svg
          kdeSvg
            .append("path")
            .datum(kdeData)
            .attr("fill", "lightgray")
            .attr("d", kdeArea);

          // Append the line on top of the area
          kdeSvg
            .append("path")
            .datum(kdeData)
            .attr("stroke", globalData.BASE_COLOR)
            .attr("stroke-width", 1.5)
            .attr("fill", "none")
            .attr("d", kdeLine);

          const isInWhatIf =
            cbgFeatureWhatIf &&
            Object.keys(cbgFeatureWhatIf).includes(String(featureIdx));

          const line = kdeSvg
            .append("line")
            .attr("class", "vertical-line")
            .attr(
              "x1",
              isInWhatIf
                ? xScale(Math.log(cbgFeatureWhatIf[featureIdx]))
                : xScale(Math.log(currFeatureVal))
            )
            .attr(
              "x2",
              isInWhatIf
                ? xScale(Math.log(cbgFeatureWhatIf[featureIdx]))
                : xScale(Math.log(currFeatureVal))
            )
            .attr("y1", 0)
            .attr("y2", 17)
            .style("stroke", "gray");

          if (features[featureIdx].type !== "poi") return;
          const circle = kdeSvg
            .append("circle")
            .attr("class", "draggable-handle")
            .attr(
              "cx",
              isInWhatIf
                ? xScale(Math.log(cbgFeatureWhatIf[featureIdx]))
                : xScale(Math.log(currFeatureVal))
            )
            .attr("cy", 17) // Position the circle at the bottom of the line
            .attr("r", 3) // Radius of the handle
            .style("fill", "steelblue")
            .style("cursor", "grab")
            .on("mousedown", function () {
              d3.select(this).style("cursor", "grabbing");
            })
            .call(
              d3
                .drag()
                .on("drag", function (event) {
                  // Constrain the drag within the x-axis range
                  const newX = Math.min(Math.max(event.x, 0), 60); // Ensure newX is within the valid range
                  d3.select(this).attr("cx", newX); // Update circle position

                  // Update the line to match the circle's new position
                  line.attr("x1", newX).attr("x2", newX);
                })
                .on("end", function (event) {
                  // Get the final x-coordinate of the circle
                  const finalX = parseFloat(d3.select(this).attr("cx"));
                  const newValue = xScale.invert(finalX);

                  UserDataStore.setSelectedCbgFeatureWhatIfByKey(
                    featureIdx,
                    Math.pow(Math.exp(1), newValue)
                  );
                  getWhatIfApi();
                })
            );
          if (isInWhatIf) {
            let valDiff = (
              cbgFeatureWhatIf[featureIdx] - currFeatureVal
            ).toFixed(1);
            if (valDiff == 0) return;
            kdeSvg
              .append("text")
              .attr("x", 80)
              .attr("y", 20)
              .text(`${valDiff > 0 ? "+" : ""}${valDiff}`)
              .style("text-anchor", "end")
              .style("font-size", "0.6rem")
              .style("fill", valDiff > 0 ? "green" : "red");
            kdeSvg
              .append("line")
              .attr("class", "vertical-line")
              .attr("x1", xScale(Math.log(currFeatureVal)))
              .attr("x2", xScale(Math.log(currFeatureVal)))
              .attr("y1", 0)
              .attr("y2", 18)
              .style("stroke", "gray")
              .style("stroke-opacity", 0.5);
          }
        });
      }
    }
  }, [
    shapData,
    sortingMode,
    disagreeSHAPIndices,
    whatIfSHAP,
    beforeInflowList,
    whatIfInflowList,
    cbgFeature,
    cbgFeatureWhatIf,
    featureNames,
    features,
    featureSlicer,
    neighborCBG,
    neighborSubgroupIdx,
    subgroupList,
    CPC,
  ]);

  return (
    <div className="h-full w-full relative">
      <div className="flex justify-between">
        <div className="view-label">What-if View</div>
        <div className="flex">
          <div className="flex mr-5">
            {CPC && (
              <Tooltip
                className="flex"
                title={`The model successfully predicts ${
                  (CPC * 100).toFixed(2)
                }% of the \n Common Part of Commuters (CPC) for actual visitors to the selected CBG.`}
              >
                <div className="self-center mr-2">CPC: </div>
                <svg width={50} height={8} className="self-center">
                  <rect width={50} height={8} fill="lightgray" />
                  <rect width={50 * CPC} height={8} fill="gray" />
                </svg>
              </Tooltip>
            )}
          </div>
          <div className="flex mr-2">
            <div className="self-center mr-2">SHAP sort by: </div>
            <Select
              className="self-center"
              size="small"
              options={[
                { value: "SORT_BY_MAG", label: "magnitude" },
                { value: "SORT_BY_DIFF", label: "variance" },
              ]}
              onChange={(e) => {
                setSortingMode(e);
              }}
              value={sortingMode}
            />
          </div>
          <div className="self-center">
            <Button
              size="small"
              disabled={Object.keys(cbgFeatureWhatIf).length === 0}
              onClick={() => {
                StaticDataStore.resetCurrStatus();
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      <div
        id="shap-container"
        className={
          "absolute top-[2rem] right-0 w-full bg-white rounded-lg text-center" +
          (isExpanded ? " h-[160%] shadow-md" : " h-[calc(100%-2rem)]")
        }
      >
        <svg ref={containerRef} className="h-full w-full"></svg>
        <button
          className="bg-white m-auto p-1 rounded-md shadow-md cursor-pointer"
          onClick={toggleExpand}
        >
          {isExpanded ? "Collapse" : "Expand"}
        </button>
      </div>
    </div>
  );
});

export default WhatIfView;
