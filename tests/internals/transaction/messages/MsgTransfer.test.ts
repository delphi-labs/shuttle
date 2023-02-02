import Long from "long";
import { CosmosMsg, MsgTransfer } from "../../../../src";

describe("MsgTransfer", () => {
  test("it returns the correct typeUrl", () => {
    const msg = new MsgTransfer({
      sender: "address1",
      receiver: "address2",
      sourcePort: "channel-1",
      sourceChannel: "channel-2",
      token: { amount: "1000000", denom: "uastrod" },
      timeoutHeight: { revisionHeight: new Long(100), revisionNumber: new Long(1) },
      timeoutTimestamp: new Long(1000000000),
    });

    expect(msg.typeUrl).toEqual("/ibc.applications.transfer.v1.MsgTransfer");
  });

  test("it converts to CosmosMsg", () => {
    const msg = new MsgTransfer({
      sender: "address1",
      receiver: "address2",
      sourcePort: "channel-1",
      sourceChannel: "channel-2",
      token: { amount: "1000000", denom: "uastrod" },
      timeoutHeight: { revisionHeight: new Long(100), revisionNumber: new Long(1) },
      timeoutTimestamp: new Long(1000000000),
    });

    const cosmosMsg: CosmosMsg = msg.toCosmosMsg();

    expect(cosmosMsg).toEqual({
      typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
      value: {
        sender: "address1",
        receiver: "address2",
        sourcePort: "channel-1",
        sourceChannel: "channel-2",
        token: { amount: "1000000", denom: "uastrod" },
        timeoutHeight: { revisionHeight: new Long(100), revisionNumber: new Long(1) },
        timeoutTimestamp: new Long(1000000000),
      },
    });
  });

  test("it converts to TerraExtension string", () => {
    const msg = new MsgTransfer({
      sender: "address1",
      receiver: "address2",
      sourcePort: "channel-1",
      sourceChannel: "channel-2",
      token: { amount: "1000000", denom: "uastrod" },
      timeoutHeight: { revisionHeight: new Long(100), revisionNumber: new Long(1) },
      timeoutTimestamp: new Long(1000000000),
    });

    const terraExtensionMsg: string = msg.toTerraExtensionMsg();

    expect(terraExtensionMsg).toEqual(
      JSON.stringify({
        "@type": "/ibc.applications.transfer.v1.MsgTransfer",
        sender: "address1",
        receiver: "address2",
        source_port: "channel-1",
        source_channel: "channel-2",
        token: { amount: "1000000", denom: "uastrod" },
        timeout_height: { revision_height: new Long(100), revision_number: new Long(1) },
        timeout_timestamp: new Long(1000000000),
      }),
    );
  });

  test("token, timeoutHeight and timeoutTimestamp are optional", () => {
    const msg = new MsgTransfer({
      sender: "address1",
      receiver: "address2",
      sourcePort: "channel-1",
      sourceChannel: "channel-2",
    });

    const cosmosMsg: CosmosMsg = msg.toCosmosMsg();

    expect(cosmosMsg).toEqual({
      typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
      value: {
        sender: "address1",
        receiver: "address2",
        sourcePort: "channel-1",
        sourceChannel: "channel-2",
      },
    });

    const terraExtensionMsg: string = msg.toTerraExtensionMsg();

    expect(terraExtensionMsg).toEqual(
      JSON.stringify({
        "@type": "/ibc.applications.transfer.v1.MsgTransfer",
        sender: "address1",
        receiver: "address2",
        source_port: "channel-1",
        source_channel: "channel-2",
      }),
    );
  });
});
