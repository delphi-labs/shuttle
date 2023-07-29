import { ref } from "vue";
import { defineStore } from "pinia";

import { DEFAULT_MAINNET } from "@/config/networks";

export const useShuttlePortStore = defineStore(
  "shuttle-port",
  () => {
    const currentNetworkId = ref(DEFAULT_MAINNET.chainId);
    function switchNetwork(network: string) {
      currentNetworkId.value = network;
    }

    return { currentNetworkId, switchNetwork };
  },
  {
    persist: true,
  },
);
