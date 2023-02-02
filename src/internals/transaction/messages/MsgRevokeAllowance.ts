import { MsgRevokeAllowance as CosmosMsgRevokeAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/tx";

import TransactionMsg, { ProtoMsg } from "./TransactionMsg";

export type MsgRevokeAllowanceValue = {
  granter: string;
  grantee: string;
};

export class MsgRevokeAllowance extends TransactionMsg<MsgRevokeAllowanceValue> {
  static TYPE = "/cosmos.feegrant.v1beta1.MsgRevokeAllowance";

  constructor({ granter, grantee }: MsgRevokeAllowanceValue) {
    super(MsgRevokeAllowance.TYPE, {
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
