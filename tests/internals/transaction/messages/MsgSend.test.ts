import { CosmosMsg, MsgSend } from "../../../../src";

describe("MsgSend", () => {
  test("it returns the correct typeUrl", () => {
    const msg = new MsgSend({
      from_address: "address1",
      to_address: "address2",
      amount: [{ denom: "uluna", amount: "100000" }],
    });

    expect(msg.typeUrl).toEqual("/cosmos.bank.v1beta1.MsgSend");
  });

  test("it converts to CosmosMsg", () => {
    const msg = new MsgSend({
      from_address: "address1",
      to_address: "address2",
      amount: [{ denom: "uluna", amount: "100000" }],
    });

    const cosmosMsg: CosmosMsg = msg.toCosmosMsg();

    expect(cosmosMsg).toEqual({
      typeUrl: "/cosmos.bank.v1beta1.MsgSend",
      value: {
        from_address: "address1",
        to_address: "address2",
        amount: [{ denom: "uluna", amount: "100000" }],
      },
    });
  });

  test("it converts to TerraExtension string", () => {
    const msg = new MsgSend({
      from_address: "address1",
      to_address: "address2",
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
});
