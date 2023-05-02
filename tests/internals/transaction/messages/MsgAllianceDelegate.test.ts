import { AminoMsg, CosmosMsg, MsgAllianceDelegate } from "../../../../src";

describe("MsgAllianceDelegate", () => {
  test("it returns the correct typeUrl", () => {
    const msg = new MsgAllianceDelegate({
      delegatorAddress: "address1",
      validatorAddress: "address2",
      amount: { denom: "uluna", amount: "100000" },
    });

    expect(msg.typeUrl).toEqual("/alliance.alliance.MsgDelegate");
  });

  test("it returns the correct aminoTypeUrl", () => {
    const msg = new MsgAllianceDelegate({
      delegatorAddress: "address1",
      validatorAddress: "address2",
      amount: { denom: "uluna", amount: "100000" },
    });

    expect(msg.aminoTypeUrl).toEqual("alliance/MsgDelegate");
  });

  test("it converts to CosmosMsg", () => {
    const msg = new MsgAllianceDelegate({
      delegatorAddress: "address1",
      validatorAddress: "address2",
      amount: { denom: "uluna", amount: "100000" },
    });

    const cosmosMsg: CosmosMsg = msg.toCosmosMsg();

    expect(cosmosMsg).toEqual({
      typeUrl: "/alliance.alliance.MsgDelegate",
      value: {
        delegatorAddress: "address1",
        validatorAddress: "address2",
        amount: { denom: "uluna", amount: "100000" },
      },
    });
  });

  test("it converts to TerraExtension string", () => {
    const msg = new MsgAllianceDelegate({
      delegatorAddress: "address1",
      validatorAddress: "address2",
      amount: { denom: "uluna", amount: "100000" },
    });

    const terraExtensionMsg: string = msg.toTerraExtensionMsg();

    expect(terraExtensionMsg).toEqual(
      JSON.stringify({
        "@type": "/alliance.alliance.MsgDelegate",
        delegator_address: "address1",
        validator_address: "address2",
        amount: { denom: "uluna", amount: "100000" },
      }),
    );
  });

  test("it converts to AminoMsg", () => {
    const msg = new MsgAllianceDelegate({
      delegatorAddress: "address1",
      validatorAddress: "address2",
      amount: { denom: "uluna", amount: "100000" },
    });

    const aminoMsg: AminoMsg = msg.toAminoMsg();

    expect(aminoMsg).toEqual({
      type: "alliance/MsgDelegate",
      value: {
        delegator_address: "address1",
        validator_address: "address2",
        amount: { denom: "uluna", amount: "100000" },
      },
    });
  });
});
