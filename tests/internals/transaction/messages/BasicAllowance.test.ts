import { CosmosMsg, BasicAllowance } from "../../../../src";

describe("BasicAllowance", () => {
  test("it returns the correct typeUrl", () => {
    const allowance = new BasicAllowance({
      spendLimit: [
        {
          amount: "100",
          denom: "uatom",
        },
      ],
    });

    expect(allowance.typeUrl).toEqual("/cosmos.feegrant.v1beta1.BasicAllowance");
  });

  test("it converts to CosmosMsg", () => {
    const spendLimit = [
      {
        amount: "100",
        denom: "uatom",
      },
    ];
    const expiration = "2021-01-01T00:00:00Z";
    const allowance = new BasicAllowance({
      spendLimit,
      expiration,
    });

    const cosmosMsg: CosmosMsg = allowance.toCosmosMsg();

    expect(cosmosMsg).toEqual({
      typeUrl: "/cosmos.feegrant.v1beta1.BasicAllowance",
      value: {
        spendLimit,
        expiration,
      },
    });
  });

  test("it converts to TerraExtension string", () => {
    const spendLimit = [
      {
        amount: "100",
        denom: "uatom",
      },
    ];
    const expiration = "2021-01-01T00:00:00Z";
    const allowance = new BasicAllowance({
      spendLimit,
      expiration,
    });

    const terraExtensionMsg: string = allowance.toTerraExtensionMsg();

    expect(terraExtensionMsg).toEqual(
      JSON.stringify({
        "@type": "/cosmos.feegrant.v1beta1.BasicAllowance",
        spend_limit: spendLimit,
        expiration,
      }),
    );
  });

  test("expiration is optional", () => {
    const spendLimit = [
      {
        amount: "100",
        denom: "uatom",
      },
    ];
    const allowance = new BasicAllowance({ spendLimit });

    const cosmosMsg: CosmosMsg = allowance.toCosmosMsg();

    expect(cosmosMsg).toEqual({
      typeUrl: "/cosmos.feegrant.v1beta1.BasicAllowance",
      value: {
        spendLimit,
      },
    });

    const terraExtensionMsg: string = allowance.toTerraExtensionMsg();

    expect(terraExtensionMsg).toEqual(
      JSON.stringify({
        "@type": "/cosmos.feegrant.v1beta1.BasicAllowance",
        spend_limit: spendLimit,
      }),
    );
  });
});
