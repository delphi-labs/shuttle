import * as React from "react";
import { render } from "@testing-library/react";

import "jest-canvas-mock";

import { MobileTerraStationProvider, ShuttleProvider, TerraStationProvider } from "../../src";

describe("ShuttleProvider render", () => {
  it("renders without crashing", () => {
    render(
      <ShuttleProvider
        mobileProviders={[
          new MobileTerraStationProvider({
            networks: [],
          }),
        ]}
        providers={[
          new TerraStationProvider({
            networks: [],
          }),
        ]}
      />,
    );
  });
});
