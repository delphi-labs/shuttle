import { CosmosMsg, BasicAllowance, MsgGrantAllowance, AminoMsg } from "../../../../src";

describe("MsgGrantAllowance", () => {
  test("it returns the correct typeUrl", () => {
    const msg = new MsgGrantAllowance({
      granter: "address1",
      grantee: "address2",
      allowance: {
        spendLimit: [
          {
            amount: "100",
            denom: "uatom",
          },
        ],
      },
    });

    expect(msg.typeUrl).toEqual("/cosmos.feegrant.v1beta1.MsgGrantAllowance");
  });

  test("it returns the correct aminoTypeUrl", () => {
    const msg = new MsgGrantAllowance({
      granter: "address1",
      grantee: "address2",
      allowance: {
        spendLimit: [
          {
            amount: "100",
            denom: "uatom",
          },
        ],
      },
    });

    expect(msg.aminoTypeUrl).toEqual("cosmos-sdk/MsgGrantAllowance");
  });

  test("it converts to CosmosMsg", () => {
    const spendLimit = [
      {
        amount: "100",
        denom: "uatom",
      },
    ];
    const allowance = { spendLimit };
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
        allowance: new BasicAllowance(allowance).toCosmosMsg(),
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
    const allowance = { spendLimit };
    const msg = new MsgGrantAllowance({
      granter: "address1",
      grantee: "address2",
      allowance,
    });

    const terraExtensionMsg: string = msg.toTerraExtensionMsg();

    const basicAllowance = new BasicAllowance(allowance);

    expect(terraExtensionMsg).toEqual(
      JSON.stringify({
        "@type": "/cosmos.feegrant.v1beta1.MsgGrantAllowance",
        granter: "address1",
        grantee: "address2",
        allowance: {
          "@type": basicAllowance.typeUrl,
          ...basicAllowance.value,
        },
      }),
    );
  });

  test("it converts to AminoMsg", () => {
    const spendLimit = [
      {
        amount: "100",
        denom: "uatom",
      },
    ];
    const allowance = { spendLimit };
    const msg = new MsgGrantAllowance({
      granter: "address1",
      grantee: "address2",
      allowance,
    });

    const aminoMsg: AminoMsg = msg.toAminoMsg();

    expect(aminoMsg).toEqual({
      type: "cosmos-sdk/MsgGrantAllowance",
      value: {
        granter: "address1",
        grantee: "address2",
        allowance: new BasicAllowance(allowance).toAminoMsg(),
      },
    });
  });
});
