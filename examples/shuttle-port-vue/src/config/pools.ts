import { INJECTIVE_MAINNET, TERRA_MAINNET, TERRA_TESTNET, INJECTIVE_TESTNET } from './networks'

export const POOLS = {
  [TERRA_MAINNET.chainId]: {
    astroNative: 'terra13rj43lsucnel7z8hakvskr7dkfj27hd9aa06pcw4nh7t66fgt7qshrpmaw'
  },
  [TERRA_TESTNET.chainId]: {
    astroNative: 'terra1udsua9w6jljwxwgwsegvt6v657rg3ayfvemupnes7lrggd28s0wq7g8azm'
  },
  [INJECTIVE_MAINNET.chainId]: {
    astroNative: 'inj1h5tz3pvy6e4ujndfdyjxy84hlmq28lnajjkl4z'
  },
  [INJECTIVE_TESTNET.chainId]: {
    astroNative: 'inj1ln5epw58qxhqyjzwulgzn0qu87e6e0rfhyv0f6'
  }
}
