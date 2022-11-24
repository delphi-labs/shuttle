import * as React from "react";
import { render } from "@testing-library/react";

import "jest-canvas-mock";

import { ShuttleProvider } from "../../src";

describe("ShuttleProvider render", () => {
  it("renders without crashing", () => {
    render(<ShuttleProvider providers={[]} />);
  });
});
