import { AminoMsg, CosmosMsg, MsgRevokeAllowance } from "../../../../src";

describe("MsgRevokeAllowance", () => {
  test("it returns the correct typeUrl", () => {
    const msg = new MsgRevokeAllowance({
      granter: "address1",
      grantee: "address2",
    });

    expect(msg.typeUrl).toEqual("/cosmos.feegrant.v1beta1.MsgRevokeAllowance");
  });

  test("it returns the correct aminoTypeUrl", () => {
    const msg = new MsgRevokeAllowance({
      granter: "address1",
      grantee: "address2",
    });

    expect(msg.aminoTypeUrl).toEqual("cosmos-sdk/MsgRevokeAllowance");
  });

  test("it converts to CosmosMsg", () => {
    const msg = new MsgRevokeAllowance({
      granter: "address1",
      grantee: "address2",
    });

    const cosmosMsg: CosmosMsg = msg.toCosmosMsg();

    expect(cosmosMsg).toEqual({
      typeUrl: "/cosmos.feegrant.v1beta1.MsgRevokeAllowance",
      value: {
        granter: "address1",
        grantee: "address2",
      },
    });
  });

  test("it converts to TerraExtension string", () => {
    const msg = new MsgRevokeAllowance({
      granter: "address1",
      grantee: "address2",
    });

    const terraExtensionMsg: string = msg.toTerraExtensionMsg();

    expect(terraExtensionMsg).toEqual(
      JSON.stringify({
        "@type": "/cosmos.feegrant.v1beta1.MsgRevokeAllowance",
        granter: "address1",
        grantee: "address2",
      }),
    );
  });

  test("it converts to AminoMsg", () => {
    const msg = new MsgRevokeAllowance({
      granter: "address1",
      grantee: "address2",
    });

    const aminoMsg: AminoMsg = msg.toAminoMsg();

    expect(aminoMsg).toEqual({
      type: "cosmos-sdk/MsgRevokeAllowance",
      value: {
        granter: "address1",
        grantee: "address2",
      },
    });
  });
});
