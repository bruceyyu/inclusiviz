import { Layout, ConfigProvider, Spin } from "antd";
import "./App.scss";
import CommunityView from "@/components/CommunityView";
import CBGView from "./components/CBGView";
import MapView from "./components/MapView";
import WhatIfView from "./components/WhatIfView";
import UserDataStore from "@/store/UserDataStore";
import * as globalData from "@/data.global";

import { observer } from "mobx-react-lite";

const { Header, Content } = Layout;

const App = observer(() => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: globalData.BASE_COLOR,
          colorPrimaryBorder: globalData.BASE_COLOR_LIGHTER,
        },
      }}
    >
      <Spin spinning={UserDataStore.getLoadingStatus}>
        <Layout className="layout">
          <Header
            className="header"
            style={{ backgroundColor: globalData.BASE_COLOR }}
          >
            InclusiViz
          </Header>
          <Content className="content">
            <div
              style={{ width: "100%", height: "100%" }}
              className="grid-container"
            >
              <div className="section view1">
                <CommunityView />
              </div>
              <div className="section view2">
                <CBGView />
              </div>
              <div className="section view3">
                <MapView />
              </div>
              <div className="section view4">
                <WhatIfView />
              </div>
            </div>
          </Content>
        </Layout>
      </Spin>
    </ConfigProvider>
  );
});

export default App;
