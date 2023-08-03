import {
  INJECTIVE_MAINNET,
  INJECTIVE_TESTNET,
  NEUTRON_MAINNET,
  NEUTRON_TESTNET,
  OSMOSIS_MAINNET,
  TERRA_MAINNET,
  TERRA_TESTNET,
} from "./networks";

export const DEFAULT_TOKEN_DECIMALS = 10 ** 6;

export const TOKEN_DECIMALS = {
  [OSMOSIS_MAINNET.chainId]: 10 ** 6,
  [TERRA_MAINNET.chainId]: 10 ** 6,
  [TERRA_TESTNET.chainId]: 10 ** 6,
  [INJECTIVE_MAINNET.chainId]: 10 ** 18,
  [INJECTIVE_TESTNET.chainId]: 10 ** 18,
  [NEUTRON_MAINNET.chainId]: 10 ** 6,
  [NEUTRON_TESTNET.chainId]: 10 ** 6,
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
  [NEUTRON_MAINNET.chainId]: {
    native: "untrn",
    astro: "ibc/5751B8BCDA688FD0A8EC0B292EEF1CDEAB4B766B63EC632778B196D317C40C3A",
  },
  [NEUTRON_TESTNET.chainId]: {
    native: "untrn",
    astro: "ibc/EFB00E728F98F0C4BBE8CA362123ACAB466EDA2826DC6837E49F4C1902F21BBA",
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
