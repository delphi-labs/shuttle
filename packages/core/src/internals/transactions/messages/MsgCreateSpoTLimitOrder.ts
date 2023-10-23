import { MsgExecuteContract as CosmosMsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import TransactionMsg, { CosmosMsg, ProtoMsg } from "./TransactionMsg";

export type MsgCreateSpotLimitOrderValue = {
  sender: string;
  order: {
    subaccountId: string;
    marketId: string;
    feeRecipient: string;
    price: string;
    quantity: string;
    orderType: number; // import injective proto type
  };
};

export class MsgCreateSpotLimitOrder extends TransactionMsg<MsgCreateSpotLimitOrderValue> {
  static override TYPE = "/injective.exchange.v1beta1.MsgCreateSpotLimitOrder";
  static override AMINO_TYPE = "exchange/MsgCreateSpotLimitOrder";

  constructor({ sender, order }: MsgCreateSpotLimitOrderValue) {
    super(MsgCreateSpotLimitOrder.TYPE, MsgCreateSpotLimitOrder.AMINO_TYPE, {
      sender,
      order,
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

export default MsgCreateSpotLimitOrder;
