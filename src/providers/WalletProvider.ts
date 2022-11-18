export type NetworkCurrency = {
  coinDenom: string;
  coinMinimalDenom: string;
  coinDecimals: number;
  coinGeckoId?: string;
  gasPriceStep?: {
    low: number;
    average: number;
    high: number;
  };
};

export type Network = {
  name: string;
  chainId: string;
  chainPrefix?: string;
  rpc: string;
  rest: string;
  gasPrice?: string;
  bip44?: {
    coinType: number;
  };
  defaultCurrency?: NetworkCurrency;
  stakeCurrency?: NetworkCurrency;
  feeCurrencies?: NetworkCurrency[];
  features?: string[];
  bech32Config?: {
    bech32PrefixAccAddr: string;
    bech32PrefixAccPub: string;
    bech32PrefixValAddr: string;
    bech32PrefixValPub: string;
    bech32PrefixConsAddr: string;
    bech32PrefixConsPub: string;
  };
};

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

export type Fee = {
  amount: { amount: string; denom: string }[];
  gas: string;
};

export type BroadcastMessage = {
  type: string;
  sender: string;
  contract: string;
  msg: any;
  funds?: { amount: string; denom: string }[];
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

export interface WalletProvider {
  id: string;
  name: string;
  networks: Map<string, Network>;
  initializing: boolean;
  initialized: boolean;
  init(): Promise<void>;
  connect(chainId: string): Promise<WalletConnection>;
  broadcast(
    messages: BroadcastMessage[],
    wallet: WalletConnection,
    feeAmount?: string,
    gasLimit?: string,
    memo?: string,
  ): Promise<BroadcastResult>;
  sign(
    messages: BroadcastMessage[],
    wallet: WalletConnection,
    feeAmount?: string,
    gasLimit?: string,
    memo?: string,
  ): Promise<SigningResult>;
}

export default WalletProvider;
