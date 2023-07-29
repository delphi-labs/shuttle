import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_MAINNET } from "./networks";

interface ShuttlePortState {
  currentNetworkId: string;
  switchNetwork: (network: string) => void;
}

export const useShuttlePortStore = create<ShuttlePortState>()(
  persist(
    (set) => ({
      currentNetworkId: DEFAULT_MAINNET.chainId,
      switchNetwork: (network: string) => set({ currentNetworkId: network }),
    }),
    {
      name: "shuttle-port",
    },
  ),
);
