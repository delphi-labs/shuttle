import { GeneratedType } from "@cosmjs/proto-signing";

import { MsgDepositForBurn } from "../externals/cctp";
import { MsgLockTokens, MsgBeginUnlocking } from "../externals/osmosis/lockup";

export const extendedRegistryTypes: ReadonlyArray<[string, GeneratedType]> = [
  ["/circle.cctp.v1.MsgDepositForBurn", MsgDepositForBurn],
  ["/osmosis.lockup.MsgLockTokens", MsgLockTokens as GeneratedType],
  ["/osmosis.lockup.MsgBeginUnlocking", MsgBeginUnlocking as GeneratedType],
];
