import { CosmosMsg, BasicAllowance, MsgGrantAllowance } from "../../../../src";

describe("MsgGrantAllowance", () => {
  test("it returns the correct typeUrl", () => {
    const msg = new MsgGrantAllowance({
      granter: "address1",
      grantee: "address2",
      allowance: new BasicAllowance({
        spendLimit: [
          {
            amount: "100",
            denom: "uatom",
          },
        ],
      }),
    });

    expect(msg.typeUrl).toEqual("/cosmos.feegrant.v1beta1.MsgGrantAllowance");
  });

  test("it converts to CosmosMsg", () => {
    const spendLimit = [
      {
        amount: "100",
        denom: "uatom",
      },
    ];
    const allowance = new BasicAllowance({ spendLimit });
    const msg = new MsgGrantAllowance({
      granter: "address1",
      grantee: "address2",
      allowance,
    });

    const cosmosMsg: CosmosMsg = msg.toCosmosMsg();

    expect(cosmosMsg).toEqual({
      typeUrl: "/cosmos.feegrant.v1beta1.MsgGrantAllowance",
      value: {
        granter: "address1",
        grantee: "address2",
        allowance: allowance.toCosmosMsg(),
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
    const allowance = new BasicAllowance({ spendLimit });
    const msg = new MsgGrantAllowance({
      granter: "address1",
      grantee: "address2",
      allowance,
    });

    const terraExtensionMsg: string = msg.toTerraExtensionMsg();

    expect(terraExtensionMsg).toEqual(
      JSON.stringify({
        "@type": "/cosmos.feegrant.v1beta1.MsgGrantAllowance",
        granter: "address1",
        grantee: "address2",
        allowance: {
          "@type": allowance.typeUrl,
          ...allowance.value,
        },
      }),
    );
  });
});
