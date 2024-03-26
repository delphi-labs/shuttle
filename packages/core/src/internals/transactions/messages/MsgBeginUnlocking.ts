import { Coin } from "@cosmjs/amino";
import Long from "long";

import { MsgBeginUnlocking as OsmosisMsgBeginUnlocking } from "../../../externals/osmosis/lockup";
import TransactionMsg, { ProtoMsg } from "./TransactionMsg";

export type MsgBeginUnlockingValue = {
  owner: string;
  ID: Long;
  coins?: Coin[];
};

export class MsgBeginUnlocking extends TransactionMsg<MsgBeginUnlockingValue> {
  static override TYPE = "/osmosis.lockup.MsgBeginUnlocking";
  static override AMINO_TYPE = "osmosis/lockup/begin-unlock-period-lock";

  constructor({ owner, ID, coins }: MsgBeginUnlockingValue) {
    super(MsgBeginUnlocking.TYPE, MsgBeginUnlocking.AMINO_TYPE, {
      owner,
      ID,
      coins,
    });
  }

  override toProtoMsg(): ProtoMsg {
    const cosmosMsg = this.toCosmosMsg();
    return {
      typeUrl: this.typeUrl,
      value: OsmosisMsgBeginUnlocking.encode(OsmosisMsgBeginUnlocking.fromPartial(cosmosMsg.value)).finish(),
    };
  }
}

export default MsgBeginUnlocking;
