import { AminoMsg, CosmosMsg, MsgCreateSpotLimitOrder } from "../../../../src";

describe("MsgCreateSpotLimitOrder", () => {
  test("it returns the correct typeUrl", () => {
    const msg = new MsgCreateSpotLimitOrder({
      sender: "address1",
      order: {
        feeRecipient: "feeRecipient",
        marketId: "marketId",
        orderType: 1,
        price: "0.1",
        quantity: "10000",
        subaccountId: "subaccountId",
      },
    });

    expect(msg.typeUrl).toEqual("/injective.exchange.v1beta1.MsgCreateSpotLimitOrder");
  });

  test("it returns the correct aminoTypeUrl", () => {
    const msg = new MsgCreateSpotLimitOrder({
      sender: "address1",
      order: {
        feeRecipient: "feeRecipient",
        marketId: "marketId",
        orderType: 1,
        price: "0.1",
        quantity: "10000",
        subaccountId: "subaccountId",
      },
    });

    expect(msg.aminoTypeUrl).toEqual("exchange/MsgCreateSpotLimitOrder");
  });

  test("it converts to CosmosMsg", () => {
    const msg = new MsgCreateSpotLimitOrder({
      sender: "address1",
      order: {
        feeRecipient: "feeRecipient",
        marketId: "marketId",
        orderType: 1,
        price: "0.1",
        quantity: "10000",
        subaccountId: "subaccountId",
      },
    });

    const cosmosMsg: CosmosMsg = msg.toCosmosMsg();

    expect(cosmosMsg).toEqual({
      typeUrl: "/injective.exchange.v1beta1.MsgCreateSpotLimitOrder",
      value: {
        sender: "address1",
        order: {
          feeRecipient: "feeRecipient",
          marketId: "marketId",
          orderType: 1,
          price: "0.1",
          quantity: "10000",
          subaccountId: "subaccountId",
        },
      },
    });
  });

  test("it converts to TerraExtension string", () => {
    const msg = new MsgCreateSpotLimitOrder({
      sender: "address1",
      order: {
        feeRecipient: "feeRecipient",
        marketId: "marketId",
        orderType: 1,
        price: "0.1",
        quantity: "10000",
        subaccountId: "subaccountId",
      },
    });

    const terraExtensionMsg: string = msg.toTerraExtensionMsg();

    expect(terraExtensionMsg).toEqual(
      JSON.stringify({
        "@type": "/injective.exchange.v1beta1.MsgCreateSpotLimitOrder",
        sender: "address1",
        order: {
          feeRecipient: "feeRecipient",
          marketId: "marketId",
          orderType: 1,
          price: "0.1",
          quantity: "10000",
          subaccountId: "subaccountId",
        },
      }),
    );
  });

  test("it converts to AminoMsg", () => {
    const msg = new MsgCreateSpotLimitOrder({
      sender: "address1",
      order: {
        feeRecipient: "feeRecipient",
        marketId: "marketId",
        orderType: 1,
        price: "0.1",
        quantity: "10000",
        subaccountId: "subaccountId",
      },
    });

    const aminoMsg: AminoMsg = msg.toAminoMsg();

    expect(aminoMsg).toEqual({
      type: "exchange/MsgCreateSpotLimitOrder",
      value: {
        sender: "address1",
        order: {
          feeRecipient: "feeRecipient",
          marketId: "marketId",
          orderType: 1,
          price: "0.1",
          quantity: "10000",
          subaccountId: "subaccountId",
        },
      },
    });
  });
});
