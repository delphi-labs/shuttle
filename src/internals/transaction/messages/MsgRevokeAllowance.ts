import { MsgRevokeAllowance as CosmosMsgRevokeAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/tx";

import TransactionMsg, { ProtoMsg } from "./TransactionMsg";

export type MsgRevokeAllowanceValue = {
  granter: string;
  grantee: string;
};

export class MsgRevokeAllowance extends TransactionMsg<MsgRevokeAllowanceValue> {
  constructor({ granter, grantee }: { granter: string; grantee: string }) {
    super("/cosmos.feegrant.v1beta1.MsgRevokeAllowance", {
      granter,
      grantee,
    });
  }

  toProtoMsg(): ProtoMsg {
    const cosmosMsg = this.toCosmosMsg();
    return {
      typeUrl: this.typeUrl,
      value: CosmosMsgRevokeAllowance.encode(CosmosMsgRevokeAllowance.fromPartial(cosmosMsg.value)).finish(),
    };
  }
}

export default MsgRevokeAllowance;
