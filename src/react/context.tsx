import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import WalletProvider, {
  WalletConnection,
  BroadcastMessage,
  BroadcastResult,
  SigningResult,
} from "../providers/WalletProvider";
import { ShuttleStore, useShuttleStore } from "./store";
import useLocalStorage from "./useLocalStorage";

type ShuttleContextType =
  | {
      providers: WalletProvider[];
      connect: (providerId: string, chainId: string) => Promise<void>;
      getWallets: (providerId?: string, chainId?: string) => WalletConnection[];
      recentWallet: WalletConnection | null;
      disconnect: (providerId?: string, chainId?: string) => void;
      disconnectWallet: (wallet: WalletConnection) => void;
      broadcast: (options: {
        messages: BroadcastMessage[];
        feeAmount?: string;
        gasLimit?: string;
        memo?: string;
        wallet?: WalletConnection;
      }) => Promise<BroadcastResult>;
      sign: (options: {
        messages: BroadcastMessage[];
        feeAmount?: string;
        gasLimit?: string;
        memo?: string;
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
  const providersToInitialize = providers.filter((provider) => !provider.initializing || !provider.initialized);
  useEffect(() => {
    providersToInitialize.forEach((provider) => {
      const alreadyInitialized = availableProviders.some((p) => p.id === provider.id);
      if (!provider.initializing && !provider.initialized && !alreadyInitialized) {
        provider
          .init()
          .then(() => {
            setAvailableProviders((prev) => [...prev, provider]);
          })
          .catch((e) => console.error(e));
      }
    });
  }, [providersToInitialize, availableProviders]);

  const internalStore = useShuttleStore();
  const [walletConnections, setWalletConnections] = useLocalStorage<WalletConnection[]>(persistentKey || "shuttle", []);
  useEffect(() => {
    if (walletConnections && walletConnections.length > 0 && internalStore.getWallets().length === 0) {
      internalStore.restore(walletConnections);
      store?.restore(walletConnections);
    }
  }, [walletConnections, internalStore, store]);

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
      messages: BroadcastMessage[];
      feeAmount?: string;
      gasLimit?: string;
      memo?: string;
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
      messages: BroadcastMessage[];
      feeAmount?: string;
      gasLimit?: string;
      memo?: string;
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
      getWallets: store?.getWallets || internalStore.getWallets,
      recentWallet: store?.recentWallet || internalStore.recentWallet,
      disconnect,
      disconnectWallet: store?.removeWallet || internalStore.removeWallet,
      broadcast,
      sign,
    };
  }, [providers, availableProviders, store, internalStore, persistent, setWalletConnections]);

  return <ShuttleContext.Provider value={providerInterface}>{children}</ShuttleContext.Provider>;
};

export const useShuttle = () => {
  const context = useContext(ShuttleContext);

  if (context === undefined) {
    throw new Error("Please wrap your component with ShuttleProvider to call: useShuttle");
  }

  return context;
};
