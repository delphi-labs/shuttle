import { computed } from "vue";
import { useShuttle } from "@delphi-labs/shuttle-vue";

import { useShuttlePortStore } from "@/stores/shuttle-port";

export default function useWallet() {
  const shuttle = useShuttle();
  const shuttlePortStore = useShuttlePortStore();

  return computed(() => {
    return shuttle.$store.getWallets({ chainId: shuttlePortStore.currentNetworkId })[0];
  });
}
