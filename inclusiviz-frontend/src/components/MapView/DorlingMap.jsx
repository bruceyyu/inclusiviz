import StaticDataStore from "@/store/StaticDataStore";
import UserDataStore from "@/store/UserDataStore";
import PropTypes from "prop-types";
import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { observer } from "mobx-react-lite";

import * as globalData from "@/data.global";

import { getGeoPathData } from "@/components/common/GeoSVG";

const communityColors = globalData.CLUSTER_COLOR_LIST;

const DorlingMap = observer(({ totalWidth, totalHeight }) => {
  const ref = useRef();
  const nodesData = StaticDataStore.getSelectedCbgNeighbors;
  const nodeWhatIfPropData = StaticDataStore.getSelectedCbgWhatIfNeighbors;
  const communityMembership = StaticDataStore.getCommunityMembership;
  const targetedNode = UserDataStore.getSelectedCbg;
  const nodeNum = UserDataStore.getTopKNeighbors;

  useEffect(() => {
    if (!targetedNode) return;
    if (!nodesData || nodesData.length === 0) return;
    const margin = { top: 5, right: 5, bottom: 5, left: 5 };
    const width = totalWidth - margin.left - margin.right;
    const height = totalHeight - margin.top - margin.bottom;
    const nodeRadius = (Math.min(width, height) / Math.max(nodeNum, 15)) * 1.3;
    const nodes = nodesData.map((ele) => {
      return {
        ...ele,
        radius: nodeRadius * ele.total_population ** 0.5,
        comm: communityMembership[ele.GEOID],
        population: ele.total_population,
        attr_list: ele.attr,
        is_target: ele.GEOID === targetedNode,
      };
    });

    if (!nodes || nodes.length === 0) return;

    const scaledNodes = nodes.map((node) => ({
      ...node,
      x: width - (node.LONGITUDE + 180) * (width / 360), // Example scaling, adjust as needed
      y: (node.LATITUDE + 90) * (height / 180), // Example scaling, adjust as needed
    }));

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove(); // Clear SVG content before drawing
    const bubbleGroup = svg.append("g");

    // Define the zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([1, 10]) // Limit the scale between 1x and 10x
      .on("zoom", (event) => {
        bubbleGroup.attr("transform", event.transform);
      });
    svg.call(zoom);

    const tooltip = d3
      .select("#dorling-container")
      .append("div")
      .style("position", "absolute")
      .style("z-index", "10")
      .style("visibility", "hidden")
      .style("background", "white")
      .style("opacity", 0.8)
      .style("padding", "0.5rem")
      .style("white-space", "pre-line");

    const simulation = d3
      .forceSimulation(scaledNodes)
      .force("charge", d3.forceManyBody().strength(4)) // Increased repulsion
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3
          .forceCollide()
          .radius((d) => d.radius * 1.2)
          .strength(1)
      ) // Additional spacing
      .on("tick", ticked);
    simulation.tick(500);

    function ticked() {
      // Draw lines (petals) for each attribute
      const numAttributes = Object.keys(scaledNodes[0].attr_value).length; // Number of attributes per node (adjust as necessary)

      scaledNodes.forEach((node, nodeIndex) => {
        const nodeRadius = node.radius;
        bubbleGroup
          .selectAll(".bg-circle")
          .data(scaledNodes)
          .join("circle")
          .attr("class", `bg-circle`)
          .attr("r", (d) => d.radius)
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y)
          // .attr("fill", "white")
          .attr("fill", (d) => communityColors[d.comm])
          .attr("fill-opacity", 0.3)
          .attr("stroke", (d) => communityColors[d.comm])
          .attr("stroke-width", (d) =>
            d.is_target ? d.radius / 8 : d.radius / 10
          )
          .attr("stroke-opacity", (d) => (d.is_target ? 1 : 0.4))
          // .attr("stroke-dasharray", (d) => d.is_target ? null : "4")
          .on("click", (d) => {
            console.log(d.target.__data__.GEOID);
          });

        let innerNodeRadius = nodeRadius * 0.7;
        const barStartAngle = - Math.PI / 4;
        const angleStep = (Math.PI * 2) / numAttributes;

        Object.values(node.attr_value).map((attrValue, attrIdx) => {
          const startX =
            node.x +
            Math.cos(barStartAngle + angleStep * (attrIdx - attrValue / 2)) *
              innerNodeRadius;
          const startY =
            node.y +
            Math.sin(barStartAngle + angleStep * (attrIdx - attrValue / 2)) *
              innerNodeRadius;
          const endX =
            node.x +
            Math.cos(barStartAngle + angleStep * (attrIdx + attrValue / 2)) *
              innerNodeRadius;
          const endY =
            node.y +
            Math.sin(barStartAngle + angleStep * (attrIdx + attrValue / 2)) *
              innerNodeRadius;

          const bgStartX =
            node.x +
            Math.cos(barStartAngle + angleStep * (attrIdx - 1 / 2)) *
              innerNodeRadius;
          const bgStartY =
            node.y +
            Math.sin(barStartAngle + angleStep * (attrIdx - 1 / 2)) *
              innerNodeRadius;
          const bgEndX =
            node.x +
            Math.cos(barStartAngle + angleStep * (attrIdx + 1 / 2)) *
              innerNodeRadius;
          const bgeEndY =
            node.y +
            Math.sin(barStartAngle + angleStep * (attrIdx + 1 / 2)) *
              innerNodeRadius;

          const pathData = `M ${startX} ${startY} A ${innerNodeRadius} ${innerNodeRadius} 0 
            0 1 ${endX} ${endY}`;
          const bgPathData = `M ${bgStartX} ${bgStartY} A ${innerNodeRadius} ${innerNodeRadius} 0 
            0 1 ${bgEndX} ${bgeEndY}`;

          bubbleGroup
            .selectAll(`#line-bg-${nodeIndex}-${attrIdx}`)
            .data([node])
            .join("path")
            .attr("id", `line-bg-${nodeIndex}-${attrIdx}`)
            .attr("class", `line-bg-${attrIdx}`)
            .attr("d", bgPathData)
            .attr("fill", "transparent")
            .attr("stroke", "lightgray")
            .attr("stroke-dasharray", "2")
            .attr("stroke-opacity", 0)
            .attr("stroke-width", 1)
            .attr("stroke-linecap", "round");

          bubbleGroup
            .selectAll(`#line-${nodeIndex}-${attrIdx}`)
            .data([node])
            .join("path")
            .attr("id", `line-${nodeIndex}-${attrIdx}`)
            .attr("class", `line-${attrIdx}`)
            .attr("d", pathData)
            .attr("fill", "transparent")
            .attr("stroke", "white")
            .attr("stroke-opacity", 1)
            .attr("stroke-width", innerNodeRadius / 4)
            .attr("stroke-linecap", "round")
            .on("mouseover", () => {
              let factListHtml = Object.entries(node.attr_value)
                .map(([attr, value], i) => {
                  return `${
                    i == attrIdx ? "<b>" : ""
                  }<div key="${i}">${attr}: ${(value * 100).toFixed(2)}%</div>${
                    i == attrIdx ? "</b>" : ""
                  }`;
                })
                .join("");
              tooltip
                .html(factListHtml)
                .style("visibility", "visible")
                .style("left", startX - 250 + "px")
                .style("top", startY - 30 + "px");
              d3.selectAll(`.line-bg-${attrIdx}`).attr("stroke-opacity", 1);
              d3.selectAll(`.line-${attrIdx}`).attr(
                "stroke-width",
                (d) => d.radius / 4
              );
              UserDataStore.setSelectedNeighborCbgForSHAP(node.GEOID);
              UserDataStore.setSelectedNeighborSubgroupIdxForSHAP(attrIdx);
            })
            .on("mouseout", () => {
              d3.selectAll(`.line-bg-${attrIdx}`).attr("stroke-opacity", 0);
              d3.selectAll(`.line-${attrIdx}`).attr(
                "stroke-width",
                (d) => (d.radius * 0.7) / 4
              );
              tooltip.style("visibility", "hidden");
              UserDataStore.setSelectedNeighborCbgForSHAP(null);
              UserDataStore.setSelectedNeighborSubgroupIdxForSHAP(null);
            });

          // bubbleGroup
          //   .selectAll(`#line-bg-invisible-${nodeIndex}-${attrIdx}`)
          //   .data([node])
          //   .join("path")
          //   .attr("id", `line-bg-invisible-${nodeIndex}-${attrIdx}`)
          //   .attr("d", bgPathData)
          //   .attr("fill", "transparent")
          //   .attr("stroke", "transparent")
          //   .attr("stroke-width", innerNodeRadius / 3)
          //   .attr("stroke-linecap", "round")
          //   .attr("z-index", 10)
            // .attr("display", "none")
            // .on("mouseover", () => {
            //   let factListHtml = Object.entries(node.attr_value)
            //     .map(([attr, value], i) => {
            //       return `${
            //         i == attrIdx ? "<b>" : ""
            //       }<div key="${i}">${attr}: ${(value * 100).toFixed(2)}%</div>${
            //         i == attrIdx ? "</b>" : ""
            //       }`;
            //     })
            //     .join("");
            //   tooltip
            //     .html(factListHtml)
            //     .style("visibility", "visible")
            //     .style("left", startX - 150 + "px")
            //     .style("top", startY - 50 + "px");
            //   d3.selectAll(`.line-bg-${attrIdx}`).attr("stroke-opacity", 1);
            //   d3.selectAll(`.line-${attrIdx}`).attr(
            //     "stroke-width",
            //     (d) => d.radius / 4
            //   );
            //   UserDataStore.setSelectedNeighborCbgForSHAP(node.GEOID);
            //   UserDataStore.setSelectedNeighborSubgroupIdxForSHAP(attrIdx);
            // })
            // .on("mouseout", () => {
            //   d3.selectAll(`.line-bg-${attrIdx}`).attr("stroke-opacity", 0);
            //   d3.selectAll(`.line-${attrIdx}`).attr(
            //     "stroke-width",
            //     (d) => (d.radius * 0.7) / 4
            //   );
            //   tooltip.style("visibility", "hidden");
            //   UserDataStore.setSelectedNeighborCbgForSHAP(null);
            //   UserDataStore.setSelectedNeighborSubgroupIdxForSHAP(null);
            // });
        });

        let cbgNodeRadius = nodeRadius * 0.5;
        bubbleGroup
          .selectAll(`#cbg-shape-${nodeIndex}`)
          .data([node])
          .join("path")
          .attr("id", `cbg-shape-${nodeIndex}`)
          .attr("d", (d) =>
            getGeoPathData(
              d.GEOID,
              cbgNodeRadius,
              cbgNodeRadius,
              d.x - cbgNodeRadius / 2,
              d.y - cbgNodeRadius / 2
            )
          )
          // .attr("stroke", (d) => communityColors[d.comm])
          .attr("stroke", (d) => d.is_target ? "black" : communityColors[d.comm])
          .style("fill", (d) =>
            d.is_target ? "black" : communityColors[d.comm]
          )
          .style("fill-opacity", 1)
          .on("mouseover", () => {
            d3.selectAll(`#cbg-shape-${nodeIndex}`).attr("stroke", "black");
          })
          .on("mouseout", () => {
            d3.selectAll(`#cbg-shape-${nodeIndex}`).attr(
              "stroke",
              (d) => d.is_target ? "black" : communityColors[d.comm]
            );
          })
          .on("click", (d) => {
            console.log(d.target.__data__.GEOID)
            UserDataStore.setSelectedCbg(d.target.__data__.GEOID)
          });

        bubbleGroup
          .selectAll(".prop-circle")
          .data(scaledNodes)
          .join("path")
          .attr("class", `prop-circle`)
          .attr("d", (d) => {
            const nodeRadius = d.radius;
            const prop = d.outflow_prop;
            const circleStartAngle = 0 - Math.PI / 2;
            const circleEndAngle = Math.PI * 2 * prop - Math.PI / 2;
            const startX = d.x + Math.cos(circleStartAngle) * nodeRadius;
            const endX = d.x + Math.cos(circleEndAngle) * nodeRadius;
            const startY = d.y + Math.sin(circleStartAngle) * nodeRadius;
            const endY = d.y + Math.sin(circleEndAngle) * nodeRadius;
            const pathData = `M ${startX} ${startY} A ${nodeRadius} ${nodeRadius} 0 ${
              prop > 0.5 ? 1 : 0
            } 1 ${endX} ${endY}`;
            return pathData;
          })
          .attr("stroke-width", (d) => d.radius / 4)
          .attr("fill", "transparent")
          .attr("stroke", (d) => communityColors[d.comm])
          .attr("stroke-linecap", "round")
          .on("click", (d) => {
            console.log(d.target.__data__.GEOID);
          });
        if (nodeWhatIfPropData && nodeWhatIfPropData.length > 0) {
          bubbleGroup
            .selectAll(".what-if-prop-circle")
            .data(scaledNodes)
            .join("path")
            .attr("class", `what-if-prop-circle`)
            .attr("d", (d) => {
              const nodeRadius = d.radius;
              const node = nodeWhatIfPropData.find(
                (ele) => ele.GEOID === d.GEOID
              );
              if (!node) return;
              const whatIfProp = node.outflow_prop_after;
              let circleStartAngle = 0 - Math.PI / 2;
              let circleEndAngle =
                Math.PI * 2 * Math.max(whatIfProp, 0) - Math.PI / 2;
              const startX = d.x + Math.cos(circleStartAngle) * nodeRadius;
              const endX = d.x + Math.cos(circleEndAngle) * nodeRadius;
              const startY = d.y + Math.sin(circleStartAngle) * nodeRadius;
              const endY = d.y + Math.sin(circleEndAngle) * nodeRadius;
              const pathData = `M ${startX} ${startY} A ${nodeRadius} ${nodeRadius} 0 ${
                whatIfProp > 0.5 ? 1 : 0
              } 1 ${endX} ${endY}`;
              return pathData;
            })
            .attr("stroke-width", (d) => d.radius / 12)
            .attr("fill", "transparent")
            .attr("stroke", globalData.BASE_COLOR_COMPLEMENT)
            // .attr("opacity", 0.8)
            .attr("stroke-linecap", "round")
            .on("click", (d) => {
              console.log(d.target.__data__.GEOID);
            });
        }
      });
    }
  }, [nodesData, totalWidth, totalHeight, nodeWhatIfPropData]);

  return (
    <div id="dorling-container" className="relative">
      <svg width={totalWidth} height={totalHeight} ref={ref} />
    </div>
  );
});

DorlingMap.propTypes = {
  totalHeight: PropTypes.number.isRequired,
  totalWidth: PropTypes.number.isRequired,
};

export default DorlingMap;
