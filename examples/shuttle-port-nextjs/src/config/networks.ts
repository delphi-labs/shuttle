import { fromInjectiveEthereumChainToCosmosChain, Network } from "@delphi-labs/shuttle-react";
import { bech32 } from "bech32";
import { Address } from "ethereumjs-util";

export const TERRA_MAINNET: Network = {
  name: "Terra 2 Mainnet",
  chainId: "phoenix-1",
  chainPrefix: "terra",
  rpc: "https://multichain-nodes.astroport.fi/phoenix-1/rpc/",
  rest: "https://multichain-nodes.astroport.fi/phoenix-1/lcd/",
  bip44: {
    coinType: 330,
  },
  defaultCurrency: {
    coinDenom: "LUNA",
    coinMinimalDenom: "uluna",
    coinDecimals: 6,
    coinGeckoId: "terra-luna-2",
  },
  gasPrice: "0.015uluna",
};

export const TERRA_TESTNET: Network = {
  name: "Terra 2 Testnet",
  chainId: "pisco-1",
  chainPrefix: "terra",
  rpc: "https://multichain-nodes.astroport.fi/pisco-1/rpc/",
  rest: "https://multichain-nodes.astroport.fi/pisco-1/lcd/",
  bip44: {
    coinType: 330,
  },
  defaultCurrency: {
    coinDenom: "LUNA",
    coinMinimalDenom: "uluna",
    coinDecimals: 6,
    coinGeckoId: "terra-luna-2",
  },
  gasPrice: "0.015uluna",
};

export const INJECTIVE_TESTNET: Network = {
  name: "Injective Testnet",
  chainId: "injective-888",
  chainPrefix: "inj",
  rpc: "https://testnet.sentry.tm.injective.network/",
  rest: "https://testnet.sentry.lcd.injective.network/",
  defaultCurrency: {
    coinDenom: "INJ",
    coinMinimalDenom: "inj",
    coinDecimals: 18,
    coinGeckoId: "injective",
  },
  gasPrice: "0.0005inj",
  evm: {
    deriveCosmosAddress: (ethAddress: string): string => {
      const addressBuffer = Address.fromString(ethAddress.toString()).toBuffer();

      return bech32.encode("inj", bech32.toWords(addressBuffer));
    },
    fromEthChainToCosmosChain: (chainId: number): string => {
      return fromInjectiveEthereumChainToCosmosChain(chainId);
    },
  },
};

export const INJECTIVE_MAINNET: Network = {
  name: "Injective Mainnet",
  chainId: "injective-1",
  chainPrefix: "inj",
  rpc: "https://multichain-nodes.astroport.fi/injective-1/rpc/",
  rest: "https://multichain-nodes.astroport.fi/injective-1/lcd/",
  defaultCurrency: {
    coinDenom: "INJ",
    coinMinimalDenom: "inj",
    coinDecimals: 18,
    coinGeckoId: "injective",
  },
  gasPrice: "0.0005inj",
  evm: {
    deriveCosmosAddress: (ethAddress: string): string => {
      const addressBuffer = Address.fromString(ethAddress.toString()).toBuffer();

      return bech32.encode("inj", bech32.toWords(addressBuffer));
    },
    fromEthChainToCosmosChain: (chainId: number): string => {
      return fromInjectiveEthereumChainToCosmosChain(chainId);
    },
  },
};

export const MARS_MAINNET: Network = {
  name: "Mars Mainnet",
  chainId: "mars-1",
  chainPrefix: "mars",
  rpc: "https://rpc.marsprotocol.io",
  rest: "https://lcd.marsprotocol.io",
  defaultCurrency: {
    coinDenom: "MARS",
    coinMinimalDenom: "mars",
    coinDecimals: 6,
    coinGeckoId: "mars",
  },
  gasPrice: "0.015mars",
};

export const OSMOSIS_MAINNET: Network = {
  name: "Osmosis Mainnet",
  chainId: "osmosis-1",
  chainPrefix: "osmosis",
  rpc: "https://rpc.osmosis.zone",
  rest: "https://lcd.osmosis.zone",
  defaultCurrency: {
    coinDenom: "OSMO",
    coinMinimalDenom: "uosmo",
    coinDecimals: 6,
    coinGeckoId: "osmosis",
  },
  gasPrice: "0.015uosmo",
};

export const NEUTRON_MAINNET: Network = {
  name: "Neutron",
  chainId: "neutron-1",
  chainPrefix: "neutron",
  rpc: "https://multichain-nodes.astroport.fi/neutron-1/rpc/",
  rest: "https://multichain-nodes.astroport.fi/neutron-1/lcd/",
  defaultCurrency: {
    coinDenom: "NTRN",
    coinMinimalDenom: "untrn",
    coinDecimals: 6,
  },
  gasPrice: "0.025untrn",
};

export const NEUTRON_TESTNET: Network = {
  name: "Neutron Testnet",
  chainId: "pion-1",
  chainPrefix: "neutron",
  rpc: "https://rpc-palvus.pion-1.ntrn.tech/",
  rest: "https://rest-palvus.pion-1.ntrn.tech/",
  defaultCurrency: {
    coinDenom: "NTRN",
    coinMinimalDenom: "untrn",
    coinDecimals: 6,
  },
  gasPrice: "0.025untrn",
};

export const ORAI_MAINNET: Network = {
  name: "Oraichain Mainnet",
  chainId: "Oraichain",
  chainPrefix: "orai",
  rpc: "https://rpc.orai.io",
  rest: "https://lcd.orai.io",
  defaultCurrency: {
    coinDenom: "ORAI",
    coinMinimalDenom: "orai",
    coinDecimals: 6,
  },
  gasPrice: "0.025orai",
};

export const ORAI_TESTNET: Network = {
  name: "Oraichain Testnet",
  chainId: "Oraichain-testnet",
  chainPrefix: "orai",
  rpc: "https://testnet-rpc.orai.io",
  rest: "https://testnet-lcd.orai.io",
  defaultCurrency: {
    coinDenom: "ORAI",
    coinMinimalDenom: "orai",
    coinDecimals: 6,
  },
  gasPrice: "0.025orai",
};

export const DEFAULT_MAINNET = TERRA_MAINNET;

export const networks = [
  TERRA_MAINNET,
  TERRA_TESTNET,
  INJECTIVE_MAINNET,
  INJECTIVE_TESTNET,
  OSMOSIS_MAINNET,
  MARS_MAINNET,
  NEUTRON_MAINNET,
  NEUTRON_TESTNET,
  ORAI_MAINNET,
  ORAI_TESTNET,
];

export function getNetworkByChainId(chainId: string): Network {
  const network = networks.find((network) => network.chainId === chainId);
  if (!network) {
    throw new Error(`Network with chainId ${chainId} not found`);
  }
  return network;
}

export function fromNetworkToNativeDenom(chainId: string): string {
  switch (chainId) {
    case "phoenix-1":
      return "uluna";
    case "pisco-1":
      return "uluna";
    case "injective-1":
      return "inj";
    case "injective-888":
      return "inj";
    case "osmosis-1":
      return "uosmo";
    case "mars-1":
      return "umars";
    case "neutron-1":
      return "untrn";
    case "pion-1":
      return "untrn";
    default:
      throw new Error(`Network with chainId ${chainId} not found`);
  }
}

export function fromNetworkToNativeSymbol(chainId: string): string {
  const denom = fromNetworkToNativeDenom(chainId);

  switch (denom) {
    case "uluna":
      return "LUNA";
    case "inj":
      return "INJ";
    case "uosmo":
      return "OSMO";
    case "umars":
      return "MARS";
    case "untrn":
      return "NTRN";
    default:
      throw new Error(`Network with chainId ${chainId} not found`);
  }
}
