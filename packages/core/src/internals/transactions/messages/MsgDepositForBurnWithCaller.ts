import { MsgDepositForBurnWithCaller as NobleMsgDepositForBurnWithCaller } from "../../../externals/cctp";

import { AminoMsg } from "@cosmjs/amino";
import TransactionMsg, { ProtoMsg } from "./TransactionMsg";
import { toBase64 } from "@cosmjs/encoding";

export type MsgDepositForBurnWithCallerValue = {
  from: string;
  amount: string;
  destinationDomain: number;
  destinationCaller: Uint8Array;
  mintRecipient: Uint8Array;
  burnToken: string;
};

export class MsgDepositForBurnWithCaller extends TransactionMsg<MsgDepositForBurnWithCallerValue> {
  static override TYPE = "/circle.cctp.v1.MsgDepositForBurnWithCaller";
  static override AMINO_TYPE = "cctp/DepositForBurnWithCaller";

  constructor({
    from,
    amount,
    destinationDomain,
    destinationCaller,
    mintRecipient,
    burnToken,
  }: MsgDepositForBurnWithCallerValue) {
    super(MsgDepositForBurnWithCaller.TYPE, MsgDepositForBurnWithCaller.AMINO_TYPE, {
      from,
      amount,
      destinationDomain,
      destinationCaller,
      mintRecipient,
      burnToken,
    });
  }

  override toTerraExtensionMsg(): string {
    return JSON.stringify({
      "@type": this.typeUrl,
      from: this.value.from,
      amount: this.value.amount,
      destination_domain: this.value.destinationDomain,
      destination_caller: toBase64(this.value.destinationCaller),
      mint_recipient: toBase64(this.value.mintRecipient),
      burn_token: this.value.burnToken,
    });
  }

  override toAminoMsg(): AminoMsg {
    return {
      type: this.aminoTypeUrl,
      value: {
        from: this.value.from,
        amount: this.value.amount,
        destination_domain: this.value.destinationDomain,
        destination_caller: toBase64(this.value.destinationCaller),
        mint_recipient: toBase64(this.value.mintRecipient),
        burn_token: this.value.burnToken,
      },
    };
  }

  override toProtoMsg(): ProtoMsg {
    const cosmosMsg = this.toCosmosMsg();
    return {
      typeUrl: this.typeUrl,
      value: NobleMsgDepositForBurnWithCaller.encode(
        NobleMsgDepositForBurnWithCaller.fromPartial(cosmosMsg.value),
      ).finish(),
    };
  }
}

export default MsgDepositForBurnWithCaller;
