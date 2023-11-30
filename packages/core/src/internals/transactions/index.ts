import { Fee } from "../../internals/cosmos";

export * from "./messages";

type SimulateResultSuccess = {
  success: true;
  fee: Fee;
};

type SimulateResultError = {
  success: false;
  error: string;
};

export type SimulateResult = SimulateResultSuccess | SimulateResultError;

export type BroadcastResult = {
  hash: string;
  rawLogs: string;
  response: any;
};

export type SigningResult = {
  signatures: Uint8Array[];
  response: any;
};
