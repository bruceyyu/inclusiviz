import { Table, Tooltip } from "antd";
import StaticDataStore from "@/store/StaticDataStore";
import UserDataStore from "@/store/UserDataStore";
import { useEffect, useState, useMemo } from "react";
import { observer } from "mobx-react-lite";
import PropTypes from "prop-types";
import * as globalData from "@/data.global";
import { getGeoPathData } from "@/components/common/GeoSVG";
import "./index.scss";

const RatioBar = ({ color, value }) => {
  RatioBar.propTypes = {
    color: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
  };
  return (
    <Tooltip title={value.toFixed(2)}>
      <div
        className="relative"
        style={{
          width: "4rem",
          margin: "auto",
        }}
      >
        <div
          style={{
            position: "absolute",
            height: "0.6rem",
            borderRadius: " 0.3rem",
            backgroundColor: "lightgray",
            width: "4rem",
          }}
        >
          <div
            style={{
              position: "absolute",
              height: "0.6rem",
              borderRadius: " 0.3rem",
              transition: "width 0.5s ease",
              backgroundColor: color,
              width: `${value * 4}rem`,
            }}
          ></div>
        </div>
      </div>
    </Tooltip>
  );
};

const RatioComparisonBar = ({
  beforeColor,
  afterColor,
  beforeValue,
  afterValue,
}) => {
  RatioComparisonBar.propTypes = {
    beforeColor: PropTypes.string.isRequired,
    afterColor: PropTypes.string.isRequired,
    beforeValue: PropTypes.number.isRequired,
    afterValue: PropTypes.number.isRequired,
  };
  // const curvedAfterValue =
  //   afterValue + ((afterValue - beforeValue) > 0
  //     ? Math.sqrt(afterValue - beforeValue)
  //     : -1 * Math.sqrt(beforeValue - afterValue));
  return (
    <Tooltip title={`${beforeValue.toFixed(2)} -> ${afterValue.toFixed(2)}`}>
      <div
        style={{
          position: "relative",
          height: "0.6rem",
          borderRadius: " 0.3rem",
          // backgroundColor: "lightgray",
          width: "4rem",
          margin: "auto",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: "0.2rem",
            left: 0,
            height: "0.2rem",
            borderRadius: " 0.3rem",
            backgroundColor: afterColor,
            width: `${afterValue * 4}rem`,
            zIndex: 2,
          }}
        ></div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: "0.6rem",
            borderRadius: " 0.3rem",
            backgroundColor: beforeColor,
            width: `${beforeValue * 4}rem`,
            zIndex: 1,
          }}
        ></div>
      </div>
    </Tooltip>
  );
};

const InflowGlyph = ({ inflowList }) => {
  const cellWidth = 30;
  InflowGlyph.propTypes = {
    inflowList: PropTypes.array.isRequired,
  };
  return (
    <div
      style={{
        backgroundColor: "transparent",
        width: cellWidth,
        height: cellWidth,
      }}
      className="flex relative"
    >
      {inflowList.map((val, idx) => (
        <div
          key={idx}
          className="absolute"
          style={{
            backgroundColor: globalData.BASE_COLOR,
            bottom: 0,
            left: `${(100 / inflowList.length) * idx}%`,
            width: `${100 / inflowList.length}%`,
            height: `${val * 100}%`,
          }}
        ></div>
      ))}
    </div>
  );
};

const InflowComparisonGlyph = ({
  beforeColor,
  afterColor,
  beforePropList,
  afterPropList,
}) => {
  const cellWidth = 30;
  InflowComparisonGlyph.propTypes = {
    beforeColor: PropTypes.string.isRequired,
    afterColor: PropTypes.string.isRequired,
    beforePropList: PropTypes.array.isRequired,
    afterPropList: PropTypes.array.isRequired,
  };
  // const curvedAfterPropList = afterPropList.map(
  //   (val, idx) =>
  //     beforePropList[idx] +
  //     (val - beforePropList[idx] > 0
  //       ? Math.sqrt(val - beforePropList[idx])
  //       : -1 * Math.sqrt(beforePropList[idx] - val))
  // );
  return (
    <div
      style={{
        backgroundColor: "transparent",
        width: cellWidth,
        height: cellWidth,
      }}
      className="flex relative"
    >
      {beforePropList.map((val, idx) => (
        <div
          key={idx}
          className="absolute"
          style={{
            backgroundColor: beforeColor,
            bottom: 0,
            left: `${(100 / beforePropList.length) * idx}%`,
            width: `${100 / beforePropList.length}%`,
            height: `${val * 100}%`,
          }}
        ></div>
      ))}
      {afterPropList.map((val, idx) => (
        <div
          key={idx}
          className="absolute"
          style={{
            backgroundColor: afterColor,
            bottom: 0,
            left: `${(100 / afterPropList.length) * (idx + 1 / 3)}%`,
            width: `${100 / afterPropList.length / 3}%`,
            height: `${val * 100}%`,
          }}
        ></div>
      ))}
    </div>
  );
};

const WhatIfRow = ({
  geoid,
  snapshotIdx,
  isCurrent = false,
  beforeData,
  whatIfData,
}) => {
  WhatIfRow.propTypes = {
    geoid: PropTypes.string,
    snapshotIdx: PropTypes.number,
    isCurrent: PropTypes.bool.isRequired,
    beforeData: PropTypes.object.isRequired,
    whatIfData: PropTypes.object.isRequired,
  };
  const beforeValue = beforeData.segregation_index;
  const afterValue = whatIfData.segregation_index;
  const beforePropList = beforeData.inflow_prop_list;
  const afterPropList = whatIfData.inflow_prop_list;
  return (
    <div
      className={`flex justify-between py-1 ${
        isCurrent ? "border-2 border-slate-300 rounded-lg" : ""
      }`}
    >
      <div className="flex justify-between self-center">
        <div
          className="self-center mr-2 w-[4rem]"
          style={{ width: "83px", textAlign: "center" }}
        >
          {(((afterValue - beforeValue) / beforeValue) * 100).toFixed(2)}%
        </div>
        <RatioComparisonBar
          beforeValue={beforeValue}
          afterValue={afterValue}
          beforeColor={globalData.BASE_COLOR}
          afterColor={globalData.BASE_COLOR_COMPLEMENT}
        />
      </div>
      <div className="flex justify-between self-center">
        <div style={{ width: "140px", margin: "auto" }}>
          <InflowComparisonGlyph
            beforeColor={globalData.BASE_COLOR}
            afterColor={globalData.BASE_COLOR_COMPLEMENT}
            beforePropList={beforePropList}
            afterPropList={afterPropList}
          />
        </div>

        <div className="flex self-center" style={{ width: "40px" }}>
          <img
            src={`/eye.svg`}
            className={`w-[1rem] h-[1rem] cursor-pointer hover:bg-zinc-300 rounded ${
              isCurrent ? "hidden" : ""
            }`}
            onClick={() => {
              UserDataStore.setSelectedCbg(geoid);
              StaticDataStore.setCurrStatusByWhatIfSnapshots(
                geoid,
                snapshotIdx
              );
            }}
          />
          <img
            src={`/confirm.svg`}
            className={`w-[1rem] h-[1rem] cursor-pointer hover:bg-zinc-300 rounded ${
              !isCurrent ? "hidden" : ""
            }`}
            onClick={() => StaticDataStore.setWhatIfSnapshotsByCurrStatus()}
          />
          <img
            src={`/delete.svg`}
            className={`w-[1rem] h-[1rem] cursor-pointer  hover:bg-zinc-300 rounded ${
              isCurrent ? "hidden" : ""
            }`}
            onClick={() =>
              StaticDataStore.deleteOneWhatIfSnapshotByKey(geoid, snapshotIdx)
            }
          />
        </div>
      </div>
    </div>
  );
};

const LineupTable = observer(() => {
  const allCBGList = StaticDataStore.getAllCbgFeature;
  const communityMembership = StaticDataStore.getCommunityMembership;
  const selectedCommunity = UserDataStore.getSelectedCommunity;
  const selectedAttr = UserDataStore.getSelectedAttr;

  const commCbgList = useMemo(() => {
    if (selectedCommunity === null) return [];
    return allCBGList.filter(
      (ele) => communityMembership[ele.GEOID] === selectedCommunity
    );
  }, [allCBGList, selectedCommunity, communityMembership]);

  const selectedCbg = UserDataStore.getSelectedCbg;
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  useEffect(() => {
    setExpandedRowKeys([selectedCbg, ...expandedRowKeys]);
  }, [selectedCbg]);

  const columns = useMemo(
    () => [
      {
        title: "CBG",
        dataIndex: "GEOID",
        width: "2rem",
        render: (GEOID) => (
          <svg width="25" height="25" key={GEOID}>
            <path
              d={getGeoPathData(GEOID, 25, 25)}
              fill={
                selectedCbg === GEOID
                  ? "black"
                  : globalData.CLUSTER_COLOR_LIST[selectedCommunity]
              }
              fillOpacity={0.8}
              stroke={globalData.CLUSTER_COLOR_LIST[selectedCommunity]}
              strokeWidth={1.2}
            />
            {/* <path
              d={getGeoPathData(GEOID, 25, 25)}
              fill="#e6e6e6"
              fillOpacity={1}
              stroke="#c7c7c7"
              strokeWidth={1.5}
            /> */}
          </svg>
        ),
      },
      {
        title: "segregation",
        dataIndex: `${selectedAttr}_segregation_index`,
        width: 120,
        render: (value) => (
          <RatioBar value={value} color={globalData.BASE_COLOR} />
        ),
        sorter: (a, b) =>
          a[`${selectedAttr}_segregation_index`] -
          b[`${selectedAttr}_segregation_index`],
      },
      {
        title: "bridging",
        dataIndex: `${selectedAttr}_bridging_index`,
        width: 120,
        render: (value) => (
          <RatioBar value={value} color={globalData.BASE_COLOR} />
        ),
        sorter: (a, b) =>
          a[`${selectedAttr}_bridging_index`] -
          b[`${selectedAttr}_bridging_index`],
      },
      {
        title: "inflow",
        dataIndex: `${selectedAttr}_inflow_prop_list`,
        width: 120,
        render: (value) => <InflowGlyph inflowList={value} />,
      },
      {
        title: "residence",
        dataIndex: `${selectedAttr}_bridging_prop_list`,
        width: 120,
        render: (value) => <InflowGlyph inflowList={value} />,
      },
    ],
    [selectedAttr, selectedCommunity, selectedCbg]
  );

  const selectedWhatIfData = StaticDataStore.getSelectedCbgWhatIfSegregation;
  const whatIfSnapshots = StaticDataStore.getWhatIfSnapshots;
  return (
    <div>
      <Table
        rowKey="GEOID"
        columns={columns}
        dataSource={commCbgList}
        style={{ height: "100%" }}
        size="small"
        pagination={false}
        onRow={(record) => {
          return {
            onClick: () => {
              UserDataStore.setSelectedCbg(record.GEOID);
            },
          };
        }}
        rowClassName={(record) => {
          if (selectedCbg === record.GEOID) {
            return "selected-row";
          }
        }}
        expandable={{
          columnWidth: 20,
          expandedRowRender: (record) => {
            let beforeData = {
              segregation_index: record[`${selectedAttr}_segregation_index`],
              inflow_prop_list: record[`${selectedAttr}_inflow_prop_list`],
            };
            return (
              <div>
                {record.GEOID === selectedCbg && selectedWhatIfData && (
                  <div>
                    <WhatIfRow
                      isCurrent={true}
                      beforeData={beforeData}
                      whatIfData={selectedWhatIfData}
                    />
                  </div>
                )}
                {whatIfSnapshots[record.GEOID] && (
                  <div>
                    {whatIfSnapshots[record.GEOID].map((ele, idx) => (
                      <WhatIfRow
                        key={idx}
                        geoid={record.GEOID}
                        snapshotIdx={idx}
                        isCurrent={false}
                        beforeData={beforeData}
                        whatIfData={ele.segregation}
                      />
                    ))}
                  </div>
                )}
                {record.GEOID === selectedCbg &&
                  !selectedWhatIfData &&
                  (!whatIfSnapshots[record.GEOID] ||
                    whatIfSnapshots[record.GEOID].length === 0) && (
                    <div>No what-if data recorded</div>
                  )}{" "}
              </div>
            );
          },
          expandedRowKeys: expandedRowKeys,
          onExpandedRowsChange: (expandedRows) => {
            setExpandedRowKeys(expandedRows);
          },
          rowExpandable: (record) =>
            record.GEOID === selectedCbg ||
            (whatIfSnapshots[record.GEOID] &&
              whatIfSnapshots[record.GEOID].length > 0),
        }}
      />
    </div>
  );
});

export default LineupTable;
