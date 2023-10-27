import { MsgExecuteContract as CosmosMsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import TransactionMsg, { CosmosMsg, ProtoMsg } from "./TransactionMsg";

export type MsgCancelSpotOrderValue = {
  sender: string;
  market_id: string;
  subaccount_id: string;
  order_hash: string;
};

export class MsgCancelSpotOrder extends TransactionMsg<MsgCancelSpotOrderValue> {
  static override TYPE = "/injective.exchange.v1beta1.MsgCancelSpotOrder";

  static override AMINO_TYPE = "exchange/MsgCancelSpotOrder";

  constructor({ sender, market_id, subaccount_id, order_hash }: MsgCancelSpotOrderValue) {
    super(MsgCancelSpotOrder.TYPE, MsgCancelSpotOrder.AMINO_TYPE, {
      sender,
      market_id,
      subaccount_id,
      order_hash,
    });
  }

  override toCosmosMsg(): CosmosMsg {
    return {
      typeUrl: this.typeUrl,
      value: {
        ...this.value,
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

export default MsgCancelSpotOrder;
