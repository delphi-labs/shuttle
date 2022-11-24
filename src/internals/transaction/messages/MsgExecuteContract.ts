import { toUtf8 } from "@cosmjs/encoding";
import { Coin } from "@cosmjs/stargate";
import TransactionMsg, { CosmosMsg } from "./TransactionMsg";

export type MsgExecuteContractValue = {
  sender: string;
  contract: string;
  msg: any;
  funds: Coin[];
};

export class MsgExecuteContract extends TransactionMsg<MsgExecuteContractValue> {
  constructor({ sender, contract, msg, funds }: { sender: string; contract: string; msg: any; funds?: Coin[] }) {
    super("/cosmwasm.wasm.v1.MsgExecuteContract", {
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
}

export default MsgExecuteContract;
