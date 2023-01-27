import create, { StateCreator } from "zustand";
import { WalletConnection } from "../internals/wallet";

export type ShuttleStore = {
  wallets: WalletConnection[];
  recentWallet: WalletConnection | null;
  restore: (wallets: WalletConnection[]) => void;
  addWallet: (wallet: WalletConnection) => void;
  removeWallet: (wallet: WalletConnection) => void;
  getWallets: (filters?: { providerId?: string; chainId?: string }) => WalletConnection[];
  removeWallets: (filters?: { providerId?: string; chainId?: string }) => void;
};
export const createShuttleStore: StateCreator<ShuttleStore> = (set, state) => ({
  recentWallet: null,
  wallets: [],
  restore: (wallets: WalletConnection[]) =>
    set(() => {
      return { wallets, recentWallet: wallets[0] };
    }),
  addWallet: (wallet: WalletConnection) =>
    set((state) => {
      const wallets = state.wallets.filter((w) => w.id !== wallet.id);
      return { wallets: [wallet, ...wallets], recentWallet: wallet };
    }),
  removeWallet: (wallet: WalletConnection) =>
    set((state) => {
      const wallets = state.wallets.filter((w) => w.id !== wallet.id);
      return { wallets, recentWallet: wallets[0] || null };
    }),
  getWallets: (filters?: { providerId?: string; chainId?: string }) => {
    let wallets = state().wallets;
    if (filters) {
      if (filters.providerId) {
        wallets = wallets.filter((wallet) => wallet.providerId === filters.providerId);
      }
      if (filters.chainId) {
        wallets = wallets.filter((wallet) => wallet.network.chainId === filters.chainId);
      }
    }
    return wallets;
  },
  removeWallets: (filters?: { providerId?: string; chainId?: string }) =>
    set((state) => {
      if (!filters) {
        return { wallets: [], recentWallet: null };
      }

      let wallets = state.wallets;

      if (filters.providerId && filters.chainId) {
        wallets = wallets.filter(
          (wallet) => wallet.providerId !== filters.providerId && wallet.network.chainId !== filters.chainId,
        );
      } else if (filters.providerId && !filters.chainId) {
        wallets = wallets.filter((wallet) => wallet.providerId !== filters.providerId);
      } else if (!filters.providerId && filters.chainId) {
        wallets = wallets.filter((wallet) => wallet.network.chainId !== filters.chainId);
      }

      return { wallets, recentWallet: wallets[0] || null };
    }),
});

export const useShuttleStore = create<ShuttleStore>(createShuttleStore);
