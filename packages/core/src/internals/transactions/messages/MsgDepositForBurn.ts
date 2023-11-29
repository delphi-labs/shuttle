import { MsgDepositForBurn as NobleMsgDepositForBurn } from "../../../externals/cctp";

import { AminoMsg } from "@cosmjs/amino";
import TransactionMsg, { ProtoMsg } from "./TransactionMsg";

export type MsgDepositForBurnValue = {
  from: string;
  amount: string;
  destinationDomain: number;
  mintRecipient: Uint8Array;
  burnToken: string;
};

export class MsgDepositForBurn extends TransactionMsg<MsgDepositForBurnValue> {
  static override TYPE = "/circle.cctp.v1.MsgDepositForBurn";
  static override AMINO_TYPE = "cosmos-sdk/MsgDepositForBurn";

  constructor({ from, amount, destinationDomain, mintRecipient, burnToken }: MsgDepositForBurnValue) {
    console.log(MsgDepositForBurn.TYPE, MsgDepositForBurn.AMINO_TYPE, {
      from,
      amount,
      destinationDomain,
      mintRecipient,
      burnToken,
    });
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
      mint_recipient: this.value.mintRecipient,
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
        mint_recipient: this.value.mintRecipient,
        burn_token: this.value.burnToken,
      },
    };
  }

  override toProtoMsg(): ProtoMsg {
    const cosmosMsg = this.toCosmosMsg();
    console.log("cosmosMsg", cosmosMsg);
    return {
      typeUrl: this.typeUrl,
      value: NobleMsgDepositForBurn.encode(NobleMsgDepositForBurn.fromPartial(cosmosMsg.value)).finish(),
    };
  }
}

export default MsgDepositForBurn;
