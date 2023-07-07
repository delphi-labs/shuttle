import { AminoMsg, CosmosMsg, MsgSend } from "../../../../src";

describe("MsgSend", () => {
  test("it returns the correct typeUrl", () => {
    const msg = new MsgSend({
      fromAddress: "address1",
      toAddress: "address2",
      amount: [{ denom: "uluna", amount: "100000" }],
    });

    expect(msg.typeUrl).toEqual("/cosmos.bank.v1beta1.MsgSend");
  });

  test("it returns the correct aminoTypeUrl", () => {
    const msg = new MsgSend({
      fromAddress: "address1",
      toAddress: "address2",
      amount: [{ denom: "uluna", amount: "100000" }],
    });

    expect(msg.aminoTypeUrl).toEqual("cosmos-sdk/MsgSend");
  });

  test("it converts to CosmosMsg", () => {
    const msg = new MsgSend({
      fromAddress: "address1",
      toAddress: "address2",
      amount: [{ denom: "uluna", amount: "100000" }],
    });

    const cosmosMsg: CosmosMsg = msg.toCosmosMsg();

    expect(cosmosMsg).toEqual({
      typeUrl: "/cosmos.bank.v1beta1.MsgSend",
      value: {
        fromAddress: "address1",
        toAddress: "address2",
        amount: [{ denom: "uluna", amount: "100000" }],
      },
    });
  });

  test("it converts to TerraExtension string", () => {
    const msg = new MsgSend({
      fromAddress: "address1",
      toAddress: "address2",
      amount: [{ denom: "uluna", amount: "100000" }],
    });

    const terraExtensionMsg: string = msg.toTerraExtensionMsg();

    expect(terraExtensionMsg).toEqual(
      JSON.stringify({
        "@type": "/cosmos.bank.v1beta1.MsgSend",
        from_address: "address1",
        to_address: "address2",
        amount: [{ denom: "uluna", amount: "100000" }],
      }),
    );
  });

  test("it converts to AminoMsg", () => {
    const msg = new MsgSend({
      fromAddress: "address1",
      toAddress: "address2",
      amount: [{ denom: "uluna", amount: "100000" }],
    });

    const aminoMsg: AminoMsg = msg.toAminoMsg();

    expect(aminoMsg).toEqual({
      type: "cosmos-sdk/MsgSend",
      value: {
        from_address: "address1",
        to_address: "address2",
        amount: [{ denom: "uluna", amount: "100000" }],
      },
    });
  });
});
