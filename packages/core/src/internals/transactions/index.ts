import { Fee } from "../../internals/cosmos";

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
