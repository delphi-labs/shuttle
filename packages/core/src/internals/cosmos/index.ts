import {
  StdFee as CosmosStdFee,
  coin as Cosmos_coin,
  coins as Cosmos_coins,
  parseCoins as Cosmos_parseCoins,
  addCoins as Cosmo_addCoins,
} from "@cosmjs/amino";

export type StdFee = CosmosStdFee;

export const coin = Cosmos_coin;

export const coins = Cosmos_coins;

export const parseCoins = Cosmos_parseCoins;

export const addCoins = Cosmo_addCoins;

export type Coin = { amount: string; denom: string };

export type Fee = {
  amount: Coin[];
  gas: string;
};

export * from "./AminoSigningClient";
export * from "./ArbitrarySigningClient";
export * from "./BroadcastClient";
export * from "./FakeOfflineSigner";
export * from "./OfflineDirectSigningClient";
export * from "./SignAndBroadcastClient";
export * from "./SimulateClient";
