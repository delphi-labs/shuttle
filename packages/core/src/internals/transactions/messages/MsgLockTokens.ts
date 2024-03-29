import { MsgLockTokens as OsmosisMsgLockTokens } from "../../../externals/osmosis/lockup";
import TransactionMsg, { AminoMsg, ProtoMsg } from "./TransactionMsg";
import { Duration } from "../../../externals/osmosis/duration";
import { Coin } from "../../../externals/osmosis/coin";

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
        duration: Duration.toAmino(this.value.duration),
        coins: this.value.coins.map((coin) => Coin.toAmino(coin)),
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
