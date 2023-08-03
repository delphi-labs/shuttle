import {
  INJECTIVE_MAINNET,
  TERRA_MAINNET,
  TERRA_TESTNET,
  INJECTIVE_TESTNET,
  NEUTRON_MAINNET,
  NEUTRON_TESTNET,
} from "./networks";

export const POOLS = {
  [TERRA_MAINNET.chainId]: {
    astroNative: "terra13rj43lsucnel7z8hakvskr7dkfj27hd9aa06pcw4nh7t66fgt7qshrpmaw",
  },
  [TERRA_TESTNET.chainId]: {
    astroNative: "terra1udsua9w6jljwxwgwsegvt6v657rg3ayfvemupnes7lrggd28s0wq7g8azm",
  },
  [INJECTIVE_MAINNET.chainId]: {
    astroNative: "inj1h5tz3pvy6e4ujndfdyjxy84hlmq28lnajjkl4z",
  },
  [INJECTIVE_TESTNET.chainId]: {
    astroNative: "inj1ln5epw58qxhqyjzwulgzn0qu87e6e0rfhyv0f6",
  },
  [NEUTRON_MAINNET.chainId]: {
    astroNative: "neutron1s2lr8u69xammmg3s8hemegcz57y07ae0wa7c7d2adupp6du3neyqd8ygp7",
  },
  [NEUTRON_TESTNET.chainId]: {
    astroNative: "neutron1vwrktvvxnevy7s5t7v44z72pdxncnq9gdsjwq9607cdd6vl2lfcs33fpah",
  },
};
