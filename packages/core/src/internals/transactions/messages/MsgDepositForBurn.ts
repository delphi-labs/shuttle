import { MsgDepositForBurn as NobleMsgDepositForBurn } from "../../../externals/cctp";

import { AminoMsg } from "@cosmjs/amino";
import TransactionMsg, { ProtoMsg } from "./TransactionMsg";
import { toBase64 } from "@cosmjs/encoding";

export type MsgDepositForBurnValue = {
  from: string;
  amount: string;
  destinationDomain: number;
  mintRecipient: Uint8Array;
  burnToken: string;
};

export class MsgDepositForBurn extends TransactionMsg<MsgDepositForBurnValue> {
  static override TYPE = "/circle.cctp.v1.MsgDepositForBurn";
  static override AMINO_TYPE = "cctp/DepositForBurn";

  constructor({ from, amount, destinationDomain, mintRecipient, burnToken }: MsgDepositForBurnValue) {
    super(MsgDepositForBurn.TYPE, MsgDepositForBurn.AMINO_TYPE, {
      from,
      amount,
      destinationDomain,
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
        mint_recipient: toBase64(this.value.mintRecipient),
        burn_token: this.value.burnToken,
      },
    };
  }

  override toProtoMsg(): ProtoMsg {
    const cosmosMsg = this.toCosmosMsg();
    return {
      typeUrl: this.typeUrl,
      value: NobleMsgDepositForBurn.encode(NobleMsgDepositForBurn.fromPartial(cosmosMsg.value)).finish(),
    };
  }
}

export default MsgDepositForBurn;
