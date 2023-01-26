import { Coin } from "@cosmjs/stargate";
import { BasicAllowance as CosmosBasicAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/feegrant";

import TransactionMsg, { ProtoMsg } from "./TransactionMsg";

export type BasicAllowanceValue = {
  spend_limit: Coin[];
  expiration?: string;
};

export class BasicAllowance extends TransactionMsg<BasicAllowanceValue> {
  constructor({ spend_limit, expiration }: { spend_limit: Coin[]; expiration?: string }) {
    super("/cosmos.feegrant.v1beta1.BasicAllowance", {
      spend_limit,
      expiration,
    });
  }

  toProtoMsg(): ProtoMsg {
    const cosmosMsg = this.toCosmosMsg();
    return {
      typeUrl: this.typeUrl,
      value: CosmosBasicAllowance.encode(CosmosBasicAllowance.fromPartial(cosmosMsg.value)).finish(),
    };
  }
}

export default BasicAllowance;
