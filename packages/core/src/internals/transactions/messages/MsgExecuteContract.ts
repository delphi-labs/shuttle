import { toUtf8 } from "@cosmjs/encoding";
import { MsgExecuteContract as CosmosMsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";

import TransactionMsg, { CosmosMsg, ProtoMsg } from "./TransactionMsg";
import { Coin } from "../../../internals/cosmos";

export type MsgExecuteContractValue = {
  sender: string;
  contract: string;
  msg: any;
  funds?: Coin[];
};

export class MsgExecuteContract extends TransactionMsg<MsgExecuteContractValue> {
  static override TYPE = "/cosmwasm.wasm.v1.MsgExecuteContract";
  static override AMINO_TYPE = "wasm/MsgExecuteContract";

  constructor({ sender, contract, msg, funds }: MsgExecuteContractValue) {
    super(MsgExecuteContract.TYPE, MsgExecuteContract.AMINO_TYPE, {
      sender,
      contract,
      msg,
      funds: funds || [],
    });
  }

  override toCosmosMsg(): CosmosMsg {
    return {
      typeUrl: this.typeUrl,
      value: {
        ...this.value,
        msg: toUtf8(JSON.stringify(this.value.msg)),
      },
    };
  }

  override toProtoMsg(): ProtoMsg {
    const cosmosMsg = this.toCosmosMsg();
    return {
      typeUrl: this.typeUrl,
      value: CosmosMsgExecuteContract.encode(CosmosMsgExecuteContract.fromPartial(cosmosMsg.value)).finish(),
    };
  }
}

export default MsgExecuteContract;
