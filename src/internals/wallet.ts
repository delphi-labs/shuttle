import { Network } from "./network";

export type Algo = "secp256k1" | "ed25519" | "sr25519";

export type Account = {
  address: string;
  algo: Algo;
  pubkey: string;
};

export type WalletConnection = {
  id: string;
  providerId: string;
  network: Network;
  account: Account;
};
