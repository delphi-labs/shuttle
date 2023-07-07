import { toUtf8 } from "@cosmjs/encoding";
import { MsgInstantiateContract as CosmosMsgInstantiateContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";

import TransactionMsg, { AminoMsg, CosmosMsg, ProtoMsg } from "./TransactionMsg";
import { Coin } from "../../../internals/cosmos";

export type MsgInstantiateContractValue = {
  sender: string;
  admin: string;
  codeId: string;
  label?: string;
  msg: any;
  funds?: Coin[];
};

export class MsgInstantiateContract extends TransactionMsg<MsgInstantiateContractValue> {
  static override TYPE = "/cosmwasm.wasm.v1.MsgInstantiateContract";
  static override AMINO_TYPE = "wasm/MsgInstantiateContract";

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

  override toTerraExtensionMsg(): string {
    return JSON.stringify({
      "@type": this.typeUrl,
      sender: this.value.sender,
      admin: this.value.admin,
      code_id: this.value.codeId,
      label: this.value.label,
      msg: this.value.msg,
      funds: this.value.funds,
    });
  }

  override toAminoMsg(): AminoMsg {
    return {
      type: this.aminoTypeUrl,
      value: {
        sender: this.value.sender,
        admin: this.value.admin,
        code_id: this.value.codeId,
        label: this.value.label,
        msg: this.value.msg,
        funds: this.value.funds,
      },
    };
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
      value: CosmosMsgInstantiateContract.encode(CosmosMsgInstantiateContract.fromPartial(cosmosMsg.value)).finish(),
    };
  }
}

export default MsgInstantiateContract;
