import { MsgGrantAllowance as CosmosMsgGrantAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/tx";

import BasicAllowance from "./BasicAllowance";
import TransactionMsg, { CosmosMsg, ProtoMsg } from "./TransactionMsg";

export type MsgGrantAllowanceValue = {
  granter: string;
  grantee: string;
  allowance: BasicAllowance;
};

export class MsgGrantAllowance extends TransactionMsg<MsgGrantAllowanceValue> {
  constructor({ granter, grantee, allowance }: { granter: string; grantee: string; allowance: BasicAllowance }) {
    super("/cosmos.feegrant.v1beta1.MsgGrantAllowance", {
      granter,
      grantee,
      allowance,
    });
  }

  toCosmosMsg(): CosmosMsg {
    return {
      typeUrl: this.typeUrl,
      value: {
        ...this.value,
        allowance: this.value.allowance.toCosmosMsg(),
      },
    };
  }

  toTerraExtensionMsg(): any {
    return JSON.stringify({
      "@type": this.typeUrl,
      ...this.value,
      allowance: {
        "@type": this.value.allowance.typeUrl,
        ...this.value.allowance.value,
      },
    });
  }

  toProtoMsg(): ProtoMsg {
    const cosmosMsg = this.toCosmosMsg();
    return {
      typeUrl: this.typeUrl,
      value: CosmosMsgGrantAllowance.encode(CosmosMsgGrantAllowance.fromPartial(cosmosMsg.value)).finish(),
    };
  }
}

export default MsgGrantAllowance;
