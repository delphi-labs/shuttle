import { defaultBech32Config } from "../src/utils";

describe("defaultBech32Config", () => {
  test("returns the correct config", () => {
    const config = defaultBech32Config("mars");

    expect(config).toEqual({
      bech32PrefixAccAddr: "mars",
      bech32PrefixAccPub: "marspub",
      bech32PrefixValAddr: "marsvaloper",
      bech32PrefixValPub: "marsvaloperpub",
      bech32PrefixConsAddr: "marsvalcons",
      bech32PrefixConsPub: "marsvalconspub",
    });
  });
});
