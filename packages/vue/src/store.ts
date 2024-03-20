import { WalletConnection } from "@delphi-labs/shuttle";
import { defineStore } from "pinia";

export type ShuttleStoreDefinition = {
  state: {
    wallets: WalletConnection[];
    recentWallet: WalletConnection | null;
  };
  getters: {
    getWallets: (
      state: ShuttleStoreDefinition["state"],
    ) => (filters?: { providerId?: string; chainId?: string }) => WalletConnection[];
  };
  actions: {
    restore(wallets: WalletConnection[]): void;
    addWallet(wallet: WalletConnection): void;
    removeWallet(wallet: WalletConnection): void;
    removeWallets(filters?: { providerId?: string; chainId?: string }): void;
  };
};

export const useShuttleStore = defineStore<
  "shuttle",
  ShuttleStoreDefinition["state"],
  ShuttleStoreDefinition["getters"],
  ShuttleStoreDefinition["actions"]
>("shuttle", {
  state: () => ({ wallets: [], recentWallet: null }),
  getters: {
    getWallets(state: ShuttleStoreDefinition["state"]) {
      return (filters?: { providerId?: string; chainId?: string }) => {
        let wallets = state.wallets;
        if (filters) {
          if (filters.providerId) {
            wallets = wallets.filter((wallet) => wallet.providerId === filters.providerId);
          }
          if (filters.chainId) {
            wallets = wallets.filter((wallet) => wallet.network.chainId === filters.chainId);
          }
        }
        return wallets;
      };
    },
  },
  actions: {
    restore(wallets: WalletConnection[]) {
      this.wallets = wallets;
      this.recentWallet = wallets[0] || null;
    },
    addWallet(wallet: WalletConnection) {
      const wallets = this.wallets.filter((w) => w.id !== wallet.id);
      this.wallets = [wallet, ...wallets];
      this.recentWallet = wallet;
    },
    removeWallet(wallet: WalletConnection) {
      const wallets = this.wallets.filter((w) => w.id !== wallet.id);
      this.wallets = wallets;
      this.recentWallet = wallets[0] || null;
    },
    removeWallets(filters?: { providerId?: string; chainId?: string }) {
      if (!filters) {
        this.wallets = [];
        this.recentWallet = null;
        return;
      }

      let wallets = this.wallets;
      if (filters.providerId && filters.chainId) {
        wallets = wallets.filter(
          (wallet) => wallet.providerId !== filters.providerId || wallet.network.chainId !== filters.chainId,
        );
      } else if (filters.providerId && !filters.chainId) {
        wallets = wallets.filter((wallet) => wallet.providerId !== filters.providerId);
      } else if (!filters.providerId && filters.chainId) {
        wallets = wallets.filter((wallet) => wallet.network.chainId !== filters.chainId);
      }
      this.wallets = wallets;
      this.recentWallet = wallets[0] || null;
    },
  },
  // @ts-ignore
  persist: true,
});

export type ShuttleStore = ReturnType<typeof useShuttleStore>;
