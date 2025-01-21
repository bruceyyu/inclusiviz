import { observer } from "mobx-react-lite";
import RealMap from "./RealMap";
import DorlingMap from "./DorlingMap";
import { useEffect, useRef, useState } from "react";
import { Switch } from "antd";

import UserDataStore from "@/store/UserDataStore";

const MapView = observer(() => {
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.offsetHeight);
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="h-full w-full">
      <div className="flex justify-between">
        <div className="flex justify-between">
          <div className="view-label mr-2">Map View</div>
          <Switch
            style={{ margin: "auto" }}
            unCheckedChildren="focus"
            checkedChildren="full"
            defaultChecked={false}
            onChange={(value) => UserDataStore.setFullMapMode(value)}
            size="small"
          />
        </div>
      </div>

      <div style={{ height: "calc(100% - 2rem)" }} className="relative">
        <div
          className="absolute h-full left-0 rounded-md cursor-pointer z-0"
          style={{ width: "50%" }}
        >
          <RealMap />
        </div>

        <div
          className="absolute h-full right-0 rounded-md cursor-pointer"
          style={{ width: "50%" }}
          ref={containerRef}
        >
          <DorlingMap
            totalWidth={containerWidth}
            totalHeight={containerHeight}
          />
        </div>
      </div>
    </div>
  );
});

export default MapView;
