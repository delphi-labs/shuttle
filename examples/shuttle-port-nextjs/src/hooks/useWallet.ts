import { useShuttle } from "@delphi-labs/shuttle-react";

import { useShuttlePortStore } from "@/config/store";

export default function useWallet() {
  const currentNetworkId = useShuttlePortStore((state) => state.currentNetworkId);
  const { getWallets } = useShuttle();

  return getWallets({ chainId: currentNetworkId })[0];
}
