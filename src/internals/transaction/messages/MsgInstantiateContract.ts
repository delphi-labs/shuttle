import { toUtf8 } from "@cosmjs/encoding";
import { MsgInstantiateContract as CosmosMsgInstantiateContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";

import TransactionMsg, { CosmosMsg, ProtoMsg } from "./TransactionMsg";
import { Coin } from "../../cosmos";

export type MsgInstantiateContractValue = {
  sender: string;
  admin: string;
  codeId: string;
  label?: string;
  msg: any;
  funds?: Coin[];
};

export class MsgInstantiateContract extends TransactionMsg<MsgInstantiateContractValue> {
  static TYPE = "/cosmwasm.wasm.v1.MsgInstantiateContract";
  static AMINO_TYPE = "wasm/MsgInstantiateContract";

  constructor({ sender, admin, codeId, label, msg, funds }: MsgInstantiateContractValue) {
    super(MsgInstantiateContract.TYPE, MsgInstantiateContract.AMINO_TYPE, {
      sender,
      admin,
      codeId,
      label,
      msg,
      funds: funds || [],
    });
  }

  toCosmosMsg(): CosmosMsg {
    return {
      typeUrl: this.typeUrl,
      value: {
        ...this.value,
        msg: toUtf8(JSON.stringify(this.value.msg)),
      },
    };
  }

  toProtoMsg(): ProtoMsg {
    const cosmosMsg = this.toCosmosMsg();
    return {
      typeUrl: this.typeUrl,
      value: CosmosMsgInstantiateContract.encode(CosmosMsgInstantiateContract.fromPartial(cosmosMsg.value)).finish(),
    };
  }
}

export default MsgInstantiateContract;
