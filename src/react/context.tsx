import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { WalletProvider } from "../providers/WalletProvider";
import { WalletConnection } from "../internals/wallet";
import { TransactionMsg, BroadcastResult, SigningResult } from "../internals/transaction";
import { ShuttleStore, useShuttleStore } from "./store";
import useLocalStorage from "./useLocalStorage";

type ShuttleContextType =
  | {
      providers: WalletProvider[];
      connect: (providerId: string, chainId: string) => Promise<void>;
      wallets: WalletConnection[];
      getWallets: (providerId?: string, chainId?: string) => WalletConnection[];
      recentWallet: WalletConnection | null;
      disconnect: (providerId?: string, chainId?: string) => void;
      disconnectWallet: (wallet: WalletConnection) => void;
      broadcast: (options: {
        messages: TransactionMsg[];
        feeAmount?: string | null;
        gasLimit?: string | null;
        memo?: string | null;
        wallet?: WalletConnection;
      }) => Promise<BroadcastResult>;
      sign: (options: {
        messages: TransactionMsg[];
        feeAmount?: string | null;
        gasLimit?: string | null;
        memo?: string | null;
        wallet?: WalletConnection;
      }) => Promise<SigningResult>;
    }
  | undefined;

export const ShuttleContext = createContext<ShuttleContextType>(undefined);

export const ShuttleProvider = ({
  persistent = false,
  persistentKey = "shuttle",
  providers = [],
  store,
  children,
}: {
  persistent?: boolean;
  persistentKey?: string;
  providers: WalletProvider[];
  store?: ShuttleStore;
  children?: React.ReactNode;
}) => {
  const [availableProviders, setAvailableProviders] = useState<WalletProvider[]>([]);

  useEffect(() => {
    providers
      .filter((provider) => !provider.initializing || !provider.initialized)
      .forEach((provider) => {
        provider
          .init()
          .then(() => {
            setAvailableProviders((prev) => {
              const rest = prev.filter((p) => p.id !== provider.id);
              return [...rest, provider];
            });
          })
          .catch((e) => console.error("Shuttle: ", e));
      });
  }, [providers]);

  const internalStore = useShuttleStore();
  const [walletConnections, setWalletConnections] = useLocalStorage<WalletConnection[]>(persistentKey || "shuttle", []);
  useEffect(() => {
    if (walletConnections && walletConnections.length > 0 && internalStore.getWallets().length === 0) {
      internalStore.restore(walletConnections);
      store?.restore(walletConnections);
    }
  }, [walletConnections, internalStore, store]);

  const getWallets = useMemo(() => {
    return store?.getWallets || internalStore.getWallets;
  }, [store, internalStore]);

  const providerInterface = useMemo(() => {
    const connect = async (providerId: string, chainId: string) => {
      const provider = availableProviders.find((provider) => provider.id === providerId);
      if (!provider) {
        throw new Error(`Provider ${providerId} not found`);
      }
      const wallet = await provider.connect(chainId);
      internalStore.addWallet(wallet);
      store?.addWallet(wallet);
      if (persistent) {
        setWalletConnections(internalStore.getWallets());
      }
    };

    const disconnect = (providerId?: string, chainId?: string) => {
      internalStore.removeWallets(providerId, chainId);
      store?.removeWallets(providerId, chainId);
      if (persistent) {
        setWalletConnections(internalStore.getWallets());
      }
    };

    const broadcast = async ({
      messages,
      feeAmount,
      gasLimit,
      memo,
      wallet,
    }: {
      messages: TransactionMsg[];
      feeAmount?: string | null;
      gasLimit?: string | null;
      memo?: string | null;
      wallet?: WalletConnection;
    }) => {
      const walletToUse = wallet || store?.recentWallet || internalStore?.recentWallet;
      if (!walletToUse) {
        throw new Error("No wallet to broadcast with");
      }

      const provider = availableProviders.find((provider) => provider.id === walletToUse.providerId);

      if (!provider) {
        throw new Error(`Provider ${walletToUse.providerId} not found`);
      }

      return provider.broadcast(messages, walletToUse, feeAmount, gasLimit, memo);
    };

    const sign = async ({
      messages,
      feeAmount,
      gasLimit,
      memo,
      wallet,
    }: {
      messages: TransactionMsg[];
      feeAmount?: string | null;
      gasLimit?: string | null;
      memo?: string | null;
      wallet?: WalletConnection;
    }) => {
      const walletToUse = wallet || store?.recentWallet || internalStore?.recentWallet;
      if (!walletToUse) {
        throw new Error("No wallet to sign with");
      }

      const provider = availableProviders.find((provider) => provider.id === walletToUse.providerId);

      if (!provider) {
        throw new Error(`Provider ${walletToUse.providerId} not found`);
      }

      return provider.sign(messages, walletToUse, feeAmount, gasLimit, memo);
    };

    return {
      providers,
      connect,
      wallets: store?.wallets || internalStore.wallets,
      getWallets,
      recentWallet: store?.recentWallet || internalStore.recentWallet,
      disconnect,
      disconnectWallet: store?.removeWallet || internalStore.removeWallet,
      broadcast,
      sign,
    };
  }, [providers, availableProviders, store, internalStore, getWallets, persistent, setWalletConnections]);

  return <ShuttleContext.Provider value={providerInterface}>{children}</ShuttleContext.Provider>;
};

export const useShuttle = () => {
  const context = useContext(ShuttleContext);

  if (context === undefined) {
    throw new Error("Please wrap your component with ShuttleProvider to call: useShuttle");
  }

  return context;
};
