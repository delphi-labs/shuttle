import { Coin } from "@cosmjs/stargate";
import { MsgTransfer as CosmosMsgTransfer } from "cosmjs-types/ibc/applications/transfer/v1/tx";

import TransactionMsg, { AminoMsg, ProtoMsg } from "./TransactionMsg";

export type MsgTransferValue = {
  sender: string;
  receiver: string;
  sourcePort: string;
  sourceChannel: string;
  token?: Coin;
  timeoutHeight?: {
    revisionNumber: string;
    revisionHeight: string;
  };
  timeoutTimestamp: string;
};

export class MsgTransfer extends TransactionMsg<MsgTransferValue> {
  static TYPE = "/ibc.applications.transfer.v1.MsgTransfer";

  constructor({
    sender,
    receiver,
    sourcePort,
    sourceChannel,
    token,
    timeoutHeight,
    timeoutTimestamp,
  }: MsgTransferValue) {
    super(MsgTransfer.TYPE, {
      sender,
      receiver,
      sourcePort,
      sourceChannel,
      token,
      timeoutHeight,
      timeoutTimestamp,
    });
  }

  toTerraExtensionMsg(): string {
    return JSON.stringify({
      "@type": this.typeUrl,
      sender: this.value.sender,
      receiver: this.value.receiver,
      source_port: this.value.sourcePort,
      source_channel: this.value.sourceChannel,
      token: this.value.token,
      timeout_height: this.value.timeoutHeight
        ? {
            revision_height: this.value.timeoutHeight.revisionHeight,
            revision_number: this.value.timeoutHeight.revisionNumber,
          }
        : undefined,
      timeout_timestamp: this.value.timeoutTimestamp,
    });
  }

  toAminoMsg(): AminoMsg<MsgTransferValue> {
    return {
      type: "cosmos-sdk/MsgTransfer",
      value: this.value,
    };
  }

  toProtoMsg(): ProtoMsg {
    const cosmosMsg = this.toCosmosMsg();
    return {
      typeUrl: this.typeUrl,
      value: CosmosMsgTransfer.encode(CosmosMsgTransfer.fromPartial(cosmosMsg.value)).finish(),
    };
  }
}

export default MsgTransfer;
