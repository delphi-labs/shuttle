import { MsgDelegate as TerraMsgAllianceDelegate } from "@terra-money/terra.proto/alliance/tx";

import TransactionMsg, { AminoMsg, ProtoMsg } from "./TransactionMsg";
import { Coin } from "../../../internals/cosmos";

export type MsgAllianceDelegateValue = {
  delegatorAddress: string;
  validatorAddress: string;
  amount: Coin;
};

export class MsgAllianceDelegate extends TransactionMsg<MsgAllianceDelegateValue> {
  static override TYPE = "/alliance.alliance.MsgDelegate";
  static override AMINO_TYPE = "alliance/MsgDelegate";

  constructor({ delegatorAddress, validatorAddress, amount }: MsgAllianceDelegateValue) {
    super(MsgAllianceDelegate.TYPE, MsgAllianceDelegate.AMINO_TYPE, {
      delegatorAddress,
      validatorAddress,
      amount,
    });
  }

  override toTerraExtensionMsg(): string {
    return JSON.stringify({
      "@type": this.typeUrl,
      delegator_address: this.value.delegatorAddress,
      validator_address: this.value.validatorAddress,
      amount: this.value.amount,
    });
  }

  override toAminoMsg(): AminoMsg {
    return {
      type: this.aminoTypeUrl,
      value: {
        delegator_address: this.value.delegatorAddress,
        validator_address: this.value.validatorAddress,
        amount: this.value.amount,
      },
    };
  }

  override toProtoMsg(): ProtoMsg {
    const cosmosMsg = this.toCosmosMsg();
    return {
      typeUrl: this.typeUrl,
      value: TerraMsgAllianceDelegate.encode(TerraMsgAllianceDelegate.fromPartial(cosmosMsg.value)).finish(),
    };
  }
}

export default MsgAllianceDelegate;
