import { INJECTIVE_MAINNET, INJECTIVE_TESTNET, OSMOSIS_MAINNET, TERRA_MAINNET, TERRA_TESTNET } from "./networks";

export const DEFAULT_TOKEN_DECIMALS = 10 ** 6;

export const TOKEN_DECIMALS = {
  [OSMOSIS_MAINNET.chainId]: 10 ** 6,
  [TERRA_MAINNET.chainId]: 10 ** 6,
  [TERRA_TESTNET.chainId]: 10 ** 6,
  [INJECTIVE_MAINNET.chainId]: 10 ** 18,
  [INJECTIVE_TESTNET.chainId]: 10 ** 18,
};

export const TOKENS = {
  [TERRA_MAINNET.chainId]: {
    native: "uluna",
    astro: "terra1nsuqsk6kh58ulczatwev87ttq2z6r3pusulg9r24mfj2fvtzd4uq3exn26",
  },
  [TERRA_TESTNET.chainId]: {
    native: "uluna",
    astro: "terra167dsqkh2alurx997wmycw9ydkyu54gyswe3ygmrs4lwume3vmwks8ruqnv",
  },
  [INJECTIVE_MAINNET.chainId]: {
    native: "inj",
    astro: "ibc/EBD5A24C554198EBAF44979C5B4D2C2D312E6EBAB71962C92F735499C7575839",
  },
  [INJECTIVE_TESTNET.chainId]: {
    native: "inj",
    astro: "ibc/E8AC6B792CDE60AB208CA060CA010A3881F682A7307F624347AB71B6A0B0BF89",
  },
};

export function getTokenDecimals(denom: string): number {
  switch (denom) {
    case "inj":
      return 10 ** 18;
    default:
      return DEFAULT_TOKEN_DECIMALS;
  }
}
