import { CosmosMsg, BasicAllowance } from "../../../../src";

describe("BasicAllowance", () => {
  test("it returns the correct typeUrl", () => {
    const allowance = new BasicAllowance({
      spend_limit: [
        {
          amount: "100",
          denom: "uatom",
        },
      ],
    });

    expect(allowance.typeUrl).toEqual("/cosmos.feegrant.v1beta1.BasicAllowance");
  });

  test("it converts to CosmosMsg", () => {
    const spend_limit = [
      {
        amount: "100",
        denom: "uatom",
      },
    ];
    const expiration = "2021-01-01T00:00:00Z";
    const allowance = new BasicAllowance({
      spend_limit,
      expiration,
    });

    const cosmosMsg: CosmosMsg = allowance.toCosmosMsg();

    expect(cosmosMsg).toEqual({
      typeUrl: "/cosmos.feegrant.v1beta1.BasicAllowance",
      value: {
        spend_limit,
        expiration,
      },
    });
  });

  test("it converts to TerraExtension string", () => {
    const spend_limit = [
      {
        amount: "100",
        denom: "uatom",
      },
    ];
    const expiration = "2021-01-01T00:00:00Z";
    const allowance = new BasicAllowance({
      spend_limit,
      expiration,
    });

    const terraExtensionMsg: string = allowance.toTerraExtensionMsg();

    expect(terraExtensionMsg).toEqual(
      JSON.stringify({
        "@type": "/cosmos.feegrant.v1beta1.BasicAllowance",
        spend_limit,
        expiration,
      }),
    );
  });

  test("expiration is optional", () => {
    const spend_limit = [
      {
        amount: "100",
        denom: "uatom",
      },
    ];
    const allowance = new BasicAllowance({ spend_limit });

    const cosmosMsg: CosmosMsg = allowance.toCosmosMsg();

    expect(cosmosMsg).toEqual({
      typeUrl: "/cosmos.feegrant.v1beta1.BasicAllowance",
      value: {
        spend_limit,
      },
    });

    const terraExtensionMsg: string = allowance.toTerraExtensionMsg();

    expect(terraExtensionMsg).toEqual(
      JSON.stringify({
        "@type": "/cosmos.feegrant.v1beta1.BasicAllowance",
        spend_limit,
      }),
    );
  });
});
