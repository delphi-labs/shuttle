import { BasicAllowance as CosmosBasicAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/feegrant";

import TransactionMsg, { AminoMsg, ProtoMsg } from "./TransactionMsg";
import { Coin } from "../../../internals/cosmos";

export type BasicAllowanceValue = {
  spendLimit: Coin[];
  expiration?: string;
};

export class BasicAllowance extends TransactionMsg<BasicAllowanceValue> {
  static override TYPE = "/cosmos.feegrant.v1beta1.BasicAllowance";
  static override AMINO_TYPE = "cosmos-sdk/BasicAllowance";

  constructor({ spendLimit, expiration }: BasicAllowanceValue) {
    super(BasicAllowance.TYPE, BasicAllowance.AMINO_TYPE, {
      spendLimit,
      expiration,
    });
  }

  override toTerraExtensionMsg(): string {
    return JSON.stringify({
      "@type": this.typeUrl,
      spend_limit: this.value.spendLimit,
      expiration: this.value.expiration,
    });
  }

  override toAminoMsg(): AminoMsg {
    return {
      type: this.aminoTypeUrl,
      value: {
        spend_limit: this.value.spendLimit,
        expiration: this.value.expiration,
      },
    };
  }

  override toProtoMsg(): ProtoMsg {
    const cosmosMsg = this.toCosmosMsg();
    return {
      typeUrl: this.typeUrl,
      value: CosmosBasicAllowance.encode(CosmosBasicAllowance.fromPartial(cosmosMsg.value)).finish(),
    };
  }
}

export default BasicAllowance;
