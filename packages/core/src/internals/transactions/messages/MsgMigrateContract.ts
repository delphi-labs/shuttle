import { toUtf8 } from "@cosmjs/encoding";
import { MsgMigrateContract as CosmosMsgMigrateContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";

import TransactionMsg, { AminoMsg, CosmosMsg, ProtoMsg } from "./TransactionMsg";

export type MsgMigrateContractValue = {
  sender: string;
  contract: string;
  codeId: string;
  msg: any;
};

export class MsgMigrateContract extends TransactionMsg<MsgMigrateContractValue> {
  static override TYPE = "/cosmwasm.wasm.v1.MsgMigrateContract";
  static override AMINO_TYPE = "wasm/MsgMigrateContract";

  constructor({ sender, contract, codeId, msg }: MsgMigrateContractValue) {
    super(MsgMigrateContract.TYPE, MsgMigrateContract.AMINO_TYPE, {
      sender,
      contract,
      codeId,
      msg,
    });
  }

  override toTerraExtensionMsg(): string {
    return JSON.stringify({
      "@type": this.typeUrl,
      sender: this.value.sender,
      contract: this.value.contract,
      code_id: this.value.codeId,
      msg: this.value.msg,
    });
  }

  override toAminoMsg(): AminoMsg {
    return {
      type: this.aminoTypeUrl,
      value: {
        sender: this.value.sender,
        contract: this.value.contract,
        code_id: this.value.codeId,
        msg: this.value.msg,
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
      value: CosmosMsgMigrateContract.encode(CosmosMsgMigrateContract.fromPartial(cosmosMsg.value)).finish(),
    };
  }
}

export default MsgMigrateContract;
