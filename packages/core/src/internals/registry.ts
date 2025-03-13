import { GeneratedType } from "@cosmjs/proto-signing";

import { MsgDepositForBurn, MsgDepositForBurnWithCaller } from "../externals/cctp";
import { MsgLockTokens, MsgBeginUnlocking } from "../externals/osmosis/lockup";

export const extendedRegistryTypes: ReadonlyArray<[string, GeneratedType]> = [
  ["/circle.cctp.v1.MsgDepositForBurn", MsgDepositForBurn],
  ["/circle.cctp.v1.MsgDepositForBurnWithCaller", MsgDepositForBurnWithCaller],
  ["/osmosis.lockup.MsgLockTokens", MsgLockTokens as GeneratedType],
  ["/osmosis.lockup.MsgBeginUnlocking", MsgBeginUnlocking as GeneratedType],
];
