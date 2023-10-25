import { AminoMsg, CosmosMsg, MsgCancelSpotOrder } from "../../../../src";

describe("MsgCreateSpotLimitOrder", () => {
  test("it returns the correct typeUrl", () => {
    const msg = new MsgCancelSpotOrder({
      sender: "address1",
      market_id: "marketId",
      subaccount_id: "subaccountId",
      order_hash: "orderHash",
    });

    expect(msg.typeUrl).toEqual("/injective.exchange.v1beta1.MsgCancelSpotOrder");
  });

  test("it returns the correct aminoTypeUrl", () => {
    const msg = new MsgCancelSpotOrder({
      sender: "address1",
      market_id: "marketId",
      subaccount_id: "subaccountId",
      order_hash: "orderHash",
    });

    expect(msg.aminoTypeUrl).toEqual("exchange/MsgCancelSpotOrder");
  });

  test("it converts to CosmosMsg", () => {
    const msg = new MsgCancelSpotOrder({
      sender: "address1",
      market_id: "marketId",
      subaccount_id: "subaccountId",
      order_hash: "orderHash",
    });

    const cosmosMsg: CosmosMsg = msg.toCosmosMsg();

    expect(cosmosMsg).toEqual({
      typeUrl: "/injective.exchange.v1beta1.MsgCancelSpotOrder",
      value: {
        sender: "address1",
        market_id: "marketId",
        subaccount_id: "subaccountId",
        order_hash: "orderHash",
      },
    });
  });

  test("it converts to TerraExtension string", () => {
    const msg = new MsgCancelSpotOrder({
      sender: "address1",
      market_id: "marketId",
      subaccount_id: "subaccountId",
      order_hash: "orderHash",
    });

    const terraExtensionMsg: string = msg.toTerraExtensionMsg();

    expect(terraExtensionMsg).toEqual(
      JSON.stringify({
        "@type": "/injective.exchange.v1beta1.MsgCancelSpotOrder",
        sender: "address1",
        market_id: "marketId",
        subaccount_id: "subaccountId",
        order_hash: "orderHash",
      }),
    );
  });

  test("it converts to AminoMsg", () => {
    const msg = new MsgCancelSpotOrder({
      sender: "address1",
      market_id: "marketId",
      subaccount_id: "subaccountId",
      order_hash: "orderHash",
    });

    const aminoMsg: AminoMsg = msg.toAminoMsg();

    expect(aminoMsg).toEqual({
      type: "exchange/MsgCancelSpotOrder",
      value: {
        sender: "address1",
        market_id: "marketId",
        subaccount_id: "subaccountId",
        order_hash: "orderHash",
      },
    });
  });
});
