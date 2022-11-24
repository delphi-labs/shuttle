import { Network } from "./network";

export type Account = {
  address: string;
  algo: "secp256k1" | "ed25519" | "sr25519";
  pubkey: string;
};

export type WalletConnection = {
  id: string;
  providerId: string;
  network: Network;
  account: Account;
};
