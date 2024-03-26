import { Coin } from "@cosmjs/amino";

import { MsgLockTokens as OsmosisMsgLockTokens } from "../../../externals/osmosis/lockup";
import TransactionMsg, { AminoMsg, ProtoMsg } from "./TransactionMsg";
import { Duration } from "../../../externals/osmosis/duration";

export type MsgLockTokensValue = {
  owner: string;
  duration: Duration;
  coins: Coin[];
};

export class MsgLockTokens extends TransactionMsg<MsgLockTokensValue> {
  static override TYPE = "/osmosis.lockup.MsgLockTokens";
  static override AMINO_TYPE = "osmosis/lockup/lock-tokens";

  constructor({ owner, duration, coins }: MsgLockTokensValue) {
    super(MsgLockTokens.TYPE, MsgLockTokens.AMINO_TYPE, {
      owner,
      duration,
      coins,
    });
  }

  override toAminoMsg(): AminoMsg {
    return {
      type: this.aminoTypeUrl,
      value: {
        ...this.value,
        duration: Number(this.value.duration.seconds.toString()) * 1_000_000_000,
      },
    };
  }

  override toProtoMsg(): ProtoMsg {
    const cosmosMsg = this.toCosmosMsg();
    return {
      typeUrl: this.typeUrl,
      value: OsmosisMsgLockTokens.encode(OsmosisMsgLockTokens.fromPartial(cosmosMsg.value)).finish(),
    };
  }
}

export default MsgLockTokens;
