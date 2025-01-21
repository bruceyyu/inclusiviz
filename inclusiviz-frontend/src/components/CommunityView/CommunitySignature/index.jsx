import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as d3 from "d3";

const CommunitySignature = ({ data, mainColor, cellWidth, cellHeight }) => {
  const d3Container = useRef(null);

  const totalWidth = cellWidth;
  const totalHeight = cellHeight;
  const margin = { top: 0, right: 0, bottom: 0, left: 0 };
  const width = totalWidth - margin.left - margin.right;
  const height = totalHeight - margin.top - margin.bottom;

  useEffect(() => {
    if (d3Container.current) {
      if (cellWidth <= 0) return
      
      const svg = d3.select(d3Container.current);

      svg.selectAll("*").remove();
      svg
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      const xScale = d3
        .scaleBand()
        .range([0, width])
        .domain(data.map((d) => d.category))
        .padding(0.2);

      const yScale = d3.scaleLinear().domain([0, 1]).range([height, 0]);
      data.forEach((d) => {
        svg
          .append("rect")
          .attr("x", xScale(d.category))
          .attr("y", yScale(d.q3))
          .attr("width", xScale.bandwidth())
          .attr("height", yScale(d.q1) - yScale(d.q3))
          .attr("fill", mainColor)
          .attr("opacity", 0.5);
        svg
          .append("line")
          .attr("x1", xScale(d.category))
          .attr("x2", xScale(d.category) + xScale.bandwidth())
          .attr("y1", yScale(d.median))
          .attr("y2", yScale(d.median))
          .attr("stroke", mainColor)
          .attr("stroke-width", "2px");
      });

      // Connect the lines for median, Q1, Q3
      const lineGenerator = d3
        .line()
        .x((d) => d[0])
        .y((d) => d[1])
        .curve(d3.curveMonotoneX);

      const generateClosedShapePoints = (data) => {
        let points = [];
        for (let i = 0; i < 2 * data.length - 1; i++) {
          let idx = Math.floor(i / 2);
          if (i % 2 === 0) {
            points.push(
              [xScale(data[idx].category), yScale(data[idx].q1)],
              [
                xScale(data[idx].category) + xScale.bandwidth(),
                yScale(data[idx].q1),
              ]
            );
          } else {
            points.push(
              [
                xScale(data[idx].category) + xScale.bandwidth(),
                yScale(data[idx].q1),
              ],
              [xScale(data[idx + 1].category), yScale(data[idx + 1].q1)]
            );
          }
        }
        points.push(
          [
            xScale(data[data.length - 1].category) + xScale.bandwidth(),
            yScale(data[data.length - 1].q1),
          ],
          [
            xScale(data[data.length - 1].category) + xScale.bandwidth(),
            yScale(data[data.length - 1].q3),
          ]
        );
        for (let i = 2 * data.length - 1; i > 1; i--) {
          let idx = Math.floor(i / 2);
          // console.log(idx, data[idx]);
          if (i % 2 === 1) {
            points.push(
              [
                xScale(data[idx].category) + xScale.bandwidth(),
                yScale(data[idx].q3),
              ],
              [xScale(data[idx].category), yScale(data[idx].q3)]
            );
          } else {
            points.push(
              [xScale(data[idx].category), yScale(data[idx].q3)],
              [
                xScale(data[idx - 1].category) + xScale.bandwidth(),
                yScale(data[idx - 1].q3),
              ]
            );
          }
        }
        points.push(
          [xScale(data[0].category), yScale(data[0].q3)],
          [xScale(data[0].category), yScale(data[0].q1)]
        );
        return points;
      };

      const generateLinePoints = (data, whichLine) => {
        let points = [];
        for (let i = 0; i < 2 * data.length - 1; i++) {
          let idx = Math.floor(i / 2);
          if (i % 2 === 0) {
            points.push(
              [xScale(data[idx].category), yScale(data[idx][whichLine])],
              [
                xScale(data[idx].category) + xScale.bandwidth(),
                yScale(data[idx][whichLine]),
              ]
            );
          } else {
            points.push(
              [
                xScale(data[idx].category) + xScale.bandwidth(),
                yScale(data[idx][whichLine]),
              ],
              [xScale(data[idx + 1].category), yScale(data[idx + 1][whichLine])]
            );
          }
        }
        return points;
      };

      svg
        .append("path")
        .datum(generateLinePoints(data, "median"))
        .attr("fill", "none")
        .attr("stroke", mainColor)
        .attr("stroke-width", "1px")
        .attr("d", lineGenerator);
      svg
        .append("path")
        .datum(generateClosedShapePoints(data))
        .attr("fill", mainColor)
        .attr("opacity", 0.2)
        .attr("stroke", mainColor)
        .attr("d", lineGenerator);
    }
  }, [data, mainColor, cellWidth, cellHeight]);
  return <svg ref={d3Container} width={totalWidth} height={totalHeight} />;
};

CommunitySignature.propTypes = {
  data: PropTypes.array.isRequired,
  mainColor: PropTypes.string,
  cellWidth: PropTypes.number,
  cellHeight: PropTypes.number,
};

export default CommunitySignature;
