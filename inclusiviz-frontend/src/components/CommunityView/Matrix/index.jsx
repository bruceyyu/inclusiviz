import "./index.scss";
import PropTypes from "prop-types";
import * as globalData from "@/data.global";
import * as d3 from "d3";

import UserDataStore from "@/store/UserDataStore";
import StaticDataStore from "@/store/StaticDataStore";
import { observer } from "mobx-react-lite";

const communityColors = globalData.CLUSTER_COLOR_LIST;

const Matrix = observer(({ flowMat, flowPropMatDict, cellWidth }) => {
  const flatMatrix = flowMat.flat().filter((ele) => ele !== null);
  const colorScale = d3
    .scaleLinear()
    .domain([Math.min(...flatMatrix), Math.max(...flatMatrix)])
    .range(globalData.CONTINUOUS_COLOR_RANGE);
  const cateList = Object.keys(flowPropMatDict);

  const LEGEND_SIZE = 10;
  const LEGEND_BAR_WIDTH = 200;

  return (
    <div>
      <div className="matrix">
        {flowMat.map((row, rowIndex) => (
          <div key={rowIndex} className="row">
            {rowIndex < flowMat.length - 1 ? (
              <div
                className="label text-center self-center cursor-pointer"
                style={{
                  backgroundColor:
                    UserDataStore.getSelectedCommunity === rowIndex
                      ? communityColors[rowIndex]
                      : "white",
                  color:
                    UserDataStore.getSelectedCommunity === rowIndex
                      ? "white"
                      : communityColors[rowIndex],
                }}
                onClick={() => UserDataStore.setSelectedCommunity(rowIndex)}
              >
                {String.fromCharCode(65 + rowIndex)}
              </div>
            ) : (
              <div className="label text-center self-center">All</div>
            )}

            {row.map((strength, colIndex) => (
              <div
                key={colIndex}
                style={{
                  backgroundColor: "white",
                  width: cellWidth * 0.7,
                  height: cellWidth * 0.8,
                  margin: cellWidth * 0.15,
                }}
                className="flex relative"
              >
                {cateList.map((cate, cateIdx) => (
                  <div
                    key={cateIdx}
                    className="absolute"
                    style={{
                      backgroundColor: colorScale(strength),
                      bottom: 0,
                      left: `${(100 / cateList.length) * cateIdx}%`,
                      width: `${100 / cateList.length}%`,
                      height: `${
                        flowPropMatDict[cate][rowIndex][colIndex] * 100
                      }%`,
                    }}
                  ></div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <svg height={LEGEND_SIZE * 5}>
          <g>
            <text x={0} y={LEGEND_SIZE * 4} textAnchor="left">
              {Math.min(...flatMatrix).toFixed(2)}
            </text>
            <text
              x={LEGEND_BAR_WIDTH - 5}
              y={LEGEND_SIZE * 4}
              textAnchor="middle"
            >
              {Math.max(...flatMatrix).toFixed(2)}
            </text>
            {d3
              .range(
                Math.min(...flatMatrix),
                Math.max(...flatMatrix),
                (Math.max(...flatMatrix) - Math.min(...flatMatrix)) / 1000
              )
              .map((v, idx) => {
                let width = LEGEND_BAR_WIDTH / 1000;
                let x = idx * width;
                return (
                  <rect
                    x={x}
                    y={LEGEND_SIZE * 2}
                    width={width}
                    height={LEGEND_SIZE}
                    fill={colorScale(v)}
                    key={idx}
                  ></rect>
                );
              })}
          </g>
        </svg>
        {typeof StaticDataStore.getCommunityModularity === 'number' && (
          <div className="self-center">modularity: {StaticDataStore.getCommunityModularity.toFixed(2)}</div>
        )}
      </div>
    </div>
  );
});

Matrix.propTypes = {
  flowMat: PropTypes.array.isRequired,
  flowPropMatDict: PropTypes.object.isRequired,
  cellWidth: PropTypes.number.isRequired,
  mainColor: PropTypes.string,
};

export default Matrix;
