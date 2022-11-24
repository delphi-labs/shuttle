import { CosmosMsg, TransactionMsg } from "../../../../src";

describe("TransactionMsg", () => {
  test("it returns the correct typeUrl", () => {
    const msg = new TransactionMsg("/tx.FakeMsg", { msg: {} });

    expect(msg.typeUrl).toEqual("/tx.FakeMsg");
  });

  test("it converts to CosmosMsg", () => {
    const msg = new TransactionMsg("/tx.FakeMsg", { msg: {} });

    const cosmosMsg: CosmosMsg = msg.toCosmosMsg();

    expect(cosmosMsg).toEqual({
      typeUrl: "/tx.FakeMsg",
      value: { msg: {} },
    });
  });

  test("it converts to TerraExtension string", () => {
    const msg = new TransactionMsg("/tx.FakeMsg", { msg: {} });

    const terraExtensionMsg: string = msg.toTerraExtensionMsg();

    expect(terraExtensionMsg).toEqual(
      JSON.stringify({
        "@type": "/tx.FakeMsg",
        msg: {},
      }),
    );
  });
});
