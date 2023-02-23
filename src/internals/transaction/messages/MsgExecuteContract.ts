import { toUtf8 } from "@cosmjs/encoding";
import { Coin } from "@cosmjs/stargate";
import { MsgExecuteContract as CosmosMsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";

import TransactionMsg, { AminoMsg, CosmosMsg, ProtoMsg } from "./TransactionMsg";

export type MsgExecuteContractValue = {
  sender: string;
  contract: string;
  msg: any;
  funds?: Coin[];
};

export class MsgExecuteContract extends TransactionMsg<MsgExecuteContractValue> {
  static TYPE = "/cosmwasm.wasm.v1.MsgExecuteContract";

  constructor({ sender, contract, msg, funds }: MsgExecuteContractValue) {
    super(MsgExecuteContract.TYPE, {
      sender,
      contract,
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

  toAminoMsg(): AminoMsg<MsgExecuteContractValue> {
    return {
      type: "wasm/MsgExecuteContract",
      value: this.value,
    };
  }

  toProtoMsg(): ProtoMsg {
    const cosmosMsg = this.toCosmosMsg();
    return {
      typeUrl: this.typeUrl,
      value: CosmosMsgExecuteContract.encode(CosmosMsgExecuteContract.fromPartial(cosmosMsg.value)).finish(),
    };
  }
}

export default MsgExecuteContract;
