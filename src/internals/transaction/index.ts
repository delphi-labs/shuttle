export * from "./messages";

export type Fee = {
  amount: { amount: string; denom: string }[];
  gas: string;
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
