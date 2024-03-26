import { Coin } from "@cosmjs/amino";

import { MsgLockTokens as OsmosisMsgLockTokens } from "../../../externals/osmosis";
import TransactionMsg, { ProtoMsg } from "./TransactionMsg";

export type MsgLockTokensValue = {
  owner: string;
  duration: string;
  coins: Coin[];
};

export class MsgLockTokens extends TransactionMsg<MsgLockTokensValue> {
  static override TYPE = "/osmosis.lockup.MsgLockTokens";
  static override AMINO_TYPE = "osmosis/lockup/lock-tokens";

  constructor({ owner, duration, coins }: MsgLockTokensValue) {
    super(MsgLockTokens.TYPE, MsgLockTokens.AMINO_TYPE, {
      owner,
      duration: (Number(duration) * 1_000_000_000).toString(),
      coins,
    });
  }

  override toProtoMsg(): ProtoMsg {
    const cosmosMsg = this.toCosmosMsg();
    return {
      typeUrl: this.typeUrl,
      value: new OsmosisMsgLockTokens(OsmosisMsgLockTokens.fromJson(cosmosMsg.value)).toBinary(),
    };
  }
}

export default MsgLockTokens;
