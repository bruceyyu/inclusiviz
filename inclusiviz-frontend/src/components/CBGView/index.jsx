import { useEffect } from "react";
import { observer } from "mobx-react-lite";
import { Slider } from "antd";
import LineupTable from "./LineupTable";
import UserDataStore from "@/store/UserDataStore";

import { getAllCbgFeatureApi } from "@/api";

const CBGView = observer(() => {
  useEffect(() => {
    getAllCbgFeatureApi();
  }, []);

  return (
    <div className="h-full">
      <div className="flex h-full w-full">
        <div className="h-full">
          <div className="flex justify-between">
            <div className="view-label">CBG View</div>
            <div className="flex">
              <div className="self-center mx-2">Top k neighbors</div>
              <Slider
                min={5}
                max={40}
                defaultValue={UserDataStore.getTopKNeighbors}
                onChangeComplete={(value) => UserDataStore.setTopKNeighbors(value)}
                style={{ width: "5rem" }}
              />
            </div>
          </div>
          <div
            style={{
              height: "calc(100% - 2rem)",
              width: "100%",
              overflow: "scroll",
            }}
          >
            <LineupTable />
          </div>
        </div>
      </div>
    </div>
  );
});

export default CBGView;
