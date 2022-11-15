import * as React from "react";
import { render } from "@testing-library/react";

import "jest-canvas-mock";

import { ShuttleContextProvider } from "../../src/react/context";

describe("ShuttleContextProvider render", () => {
  it("renders without crashing", () => {
    render(<ShuttleContextProvider providers={[]} />);
  });
});
