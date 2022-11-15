import create, { StateCreator } from "zustand";
import { WalletConnection } from "../providers/WalletProvider";

export type ShuttleStore = {
  wallets: WalletConnection[];
  recentWallet: WalletConnection | null;
  restore: (wallets: WalletConnection[]) => void;
  addWallet: (wallet: WalletConnection) => void;
  removeWallet: (wallet: WalletConnection) => void;
  getWallets: (providerId?: string, chainId?: string) => WalletConnection[];
  removeWallets: (providerId?: string, chainId?: string) => void;
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
  getWallets: (providerId?: string, chainId?: string) => {
    let wallets = state().wallets;
    if (providerId) {
      wallets = wallets.filter((wallet) => wallet.providerId === providerId);
    }
    if (chainId) {
      wallets = wallets.filter((wallet) => wallet.network.chainId === chainId);
    }
    return wallets;
  },
  removeWallets: (providerId?: string, chainId?: string) =>
    set((state) => {
      if (!providerId && !chainId) {
        return { wallets: [], recentWallet: null };
      }

      let wallets = state.wallets;

      if (providerId && chainId) {
        wallets = wallets.filter((wallet) => wallet.providerId !== providerId || wallet.network.chainId !== chainId);
      }

      if (providerId && !chainId) {
        wallets = wallets.filter((wallet) => wallet.providerId !== providerId);
      }

      return { wallets, recentWallet: wallets[0] || null };
    }),
});

export const useShuttleStore = create<ShuttleStore>(createShuttleStore);
