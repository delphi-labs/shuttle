import { Fee } from "../../internals/cosmos";
import { type DeliverTxResponse } from "@cosmjs/stargate";

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
  /**
   * A string-based log document.
   *
   * This currently seems to merge attributes of multiple events into one event per type
   * (https://github.com/tendermint/tendermint/issues/9595). You might want to use the `events`
   * field instead.
   *
   * @deprecated This field is not filled anymore in Cosmos SDK 0.50+ (https://github.com/cosmos/cosmos-sdk/pull/15845).
   * Please consider using `events` instead.
   */
  rawLogs: DeliverTxResponse["rawLog"];
  events: DeliverTxResponse["events"];
  response: any;
};

export type SigningResult = {
  signatures: Uint8Array[];
  response: any;
};
