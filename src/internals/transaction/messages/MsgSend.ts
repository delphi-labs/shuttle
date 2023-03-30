import { Coin } from "@cosmjs/stargate";
import { MsgSend as CosmosMsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx";

import TransactionMsg, { AminoMsg, ProtoMsg } from "./TransactionMsg";

export type MsgSendValue = {
  from_address: string;
  to_address: string;
  amount: Coin[];
};

export class MsgSend extends TransactionMsg<MsgSendValue> {
  static TYPE = "/cosmos.bank.v1beta1.MsgSend";

  constructor({ from_address, to_address, amount }: MsgSendValue) {
    super(MsgSend.TYPE, {
      from_address,
      to_address,
      amount,
    });
  }

  toTerraExtensionMsg(): string {
    const { from_address, to_address, amount } = this.value;

    return JSON.stringify({
      "@type": this.typeUrl,
      from_address,
      to_address,
      amount,
    });
  }

  toAminoMsg(): AminoMsg<MsgSendValue> {
    const { from_address, to_address, amount } = this.value;

    return {
      type: "cosmos-sdk/MsgSend",
      value: {
        from_address,
        to_address,
        amount,
      },
    };
  }

  toProtoMsg(): ProtoMsg {
    const cosmosMsg = this.toCosmosMsg();
    return {
      typeUrl: this.typeUrl,
      value: CosmosMsgSend.encode(CosmosMsgSend.fromPartial(cosmosMsg.value)).finish(),
    };
  }
}

export default MsgSend;
