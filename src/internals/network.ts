import { EthereumChainId } from "@injectivelabs/ts-types";

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

export function isInjectiveNetwork(chainId: string): boolean {
  return chainId === "injective-1" || chainId === "injective-888";
}

export function fromInjectiveCosmosChainToEthereumChain(chainId: string): number {
  if (chainId === "injective-1") {
    return EthereumChainId.Mainnet;
  } else if (chainId === "injective-888") {
    return EthereumChainId.Goerli;
  } else {
    throw new Error(`Invalid Injective chainId: ${chainId}`);
  }
}

export function fromInjectiveEthereumChainToCosmosChain(chainNumber: number): string {
  if (chainNumber === EthereumChainId.Mainnet) {
    return "injective-1";
  } else if (chainNumber === EthereumChainId.Goerli) {
    return "injective-888";
  } else {
    throw new Error(`Invalid Injective EVM chainId: ${chainNumber}`);
  }
}

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
