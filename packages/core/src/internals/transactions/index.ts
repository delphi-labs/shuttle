import { GeneratedType, Registry } from "@cosmjs/proto-signing";
import { Fee } from "../../internals/cosmos";
import { MsgDepositForBurn } from "../../externals/cctp";

export * from "./messages";

export type SimulateResult = {
  success: boolean;
  error?: string | null;
  fee?: Fee | null;
};

export type BroadcastResult = {
  hash: string;
  rawLogs: string;
  response: any;
};

export type SigningResult = {
  signatures: Uint8Array[];
  response: any;
};

export function createDefaultRegistry(): Registry {
  const registryTypes: ReadonlyArray<[string, GeneratedType]> = [
    ["/circle.cctp.v1.MsgDepositForBurn", MsgDepositForBurn],
  ];
  return new Registry(registryTypes);
}
