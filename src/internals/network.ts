export type BIP44 = {
  coinType: number;
};

export type Bech32Config = {
  bech32PrefixAccAddr: string;
  bech32PrefixAccPub: string;
  bech32PrefixValAddr: string;
  bech32PrefixValPub: string;
  bech32PrefixConsAddr: string;
  bech32PrefixConsPub: string;
};

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
  bip44?: BIP44;
  defaultCurrency?: NetworkCurrency;
  stakeCurrency?: NetworkCurrency;
  feeCurrencies?: NetworkCurrency[];
  features?: string[];
  bech32Config?: Bech32Config;
  evm?: {
    deriveCosmosAddress: (address: string) => string;
    fromEthChainToCosmosChain: (chainId: number) => string;
  };
};

export const DEFAULT_CHAIN_PREFIX = "cosmos";
export const DEFAULT_BIP44_COIN_TYPE = 118;
export const DEFAULT_CURRENCY = {
  coinDenom: "ATOM",
  coinMinimalDenom: "uatom",
  coinDecimals: 6,
  coinGeckoId: "cosmos",
};
export const DEFAULT_GAS_PRICE = `0.2${DEFAULT_CURRENCY.coinDenom}`;
export const DEFAULT_GAS_MULTIPLIER = 1.3;
