import { Network } from "./network";

export type Algo = "secp256k1" | "ed25519" | "sr25519";
export enum Algos {
  secp256k1 = "secp256k1",
  ed25519 = "ed25519",
  sr25519 = "sr25519",
}

export type Account = {
  address: string;
  algo: Algo | null;
  pubkey: string | null;
  isLedger?: boolean;
};

export type WalletConnection = {
  id: string;
  providerId: string;
  network: Network;
  account: Account;
};
