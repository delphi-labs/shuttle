import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MobileWalletProvider } from "../mobileProviders/MobileWalletProvider";
import { WalletProvider } from "../providers/WalletProvider";
import { WalletConnection } from "../internals/wallet";
import { MobileConnectResponse } from "../internals/provider";
import { TransactionMsg, SimulateResult, BroadcastResult, SigningResult } from "../internals/transaction";
import { ShuttleStore, useShuttleStore } from "./store";
import useLocalStorage from "./useLocalStorage";

type ShuttleContextType =
  | {
      providers: WalletProvider[];
      mobileProviders: MobileWalletProvider[];
      mobileConnect: (options: {
        mobileProviderId: string;
        chainId: string;
        callback?: (walletConnection: WalletConnection) => void;
      }) => Promise<MobileConnectResponse>;
      connect: (options: { providerId: string; chainId: string }) => Promise<void>;
      wallets: WalletConnection[];
      getWallets: (filters?: { providerId?: string; chainId?: string }) => WalletConnection[];
      recentWallet: WalletConnection | null;
      disconnect: (filters?: { providerId?: string; chainId?: string }) => void;
      disconnectWallet: (wallet: WalletConnection) => void;
      simulate: (options: { messages: TransactionMsg[]; wallet?: WalletConnection | null }) => Promise<SimulateResult>;
      broadcast: (options: {
        messages: TransactionMsg[];
        feeAmount?: string | null;
        gasLimit?: string | null;
        memo?: string | null;
        wallet?: WalletConnection | null;
        mobile?: boolean;
      }) => Promise<BroadcastResult>;
      sign: (options: {
        messages: TransactionMsg[];
        feeAmount?: string | null;
        gasLimit?: string | null;
        memo?: string | null;
        wallet?: WalletConnection | null;
        mobile?: boolean;
      }) => Promise<SigningResult>;
    }
  | undefined;

export const ShuttleContext = createContext<ShuttleContextType>(undefined);

export const ShuttleProvider = ({
  persistent = false,
  persistentKey = "shuttle",
  providers = [],
  mobileProviders = [],
  store,
  children,
}: {
  persistent?: boolean;
  persistentKey?: string;
  providers: WalletProvider[];
  mobileProviders: MobileWalletProvider[];
  store?: ShuttleStore;
  children?: React.ReactNode;
}) => {
  const [availableProviders, setAvailableProviders] = useState<WalletProvider[]>([]);
  const [availableMobileProviders, setAvailableMobileProviders] = useState<MobileWalletProvider[]>([]);

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
          .catch((e) => console.warn("Shuttle: ", e));
      });

    mobileProviders
      .filter((mobileProvider) => !mobileProvider.initializing || !mobileProvider.initialized)
      .forEach((mobileProvider) => {
        mobileProvider
          .init()
          .then(() => {
            setAvailableMobileProviders((prev) => {
              const rest = prev.filter((p) => p.id !== mobileProvider.id);
              return [...rest, mobileProvider];
            });
          })
          .catch((e) => console.warn("Shuttle: ", e));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const internalStore = useShuttleStore();
  const [walletConnections, setWalletConnections] = useLocalStorage<WalletConnection[]>(persistentKey || "shuttle", []);
  useEffect(() => {
    if (walletConnections && walletConnections.length > 0 && internalStore.getWallets().length === 0) {
      internalStore.restore(walletConnections);
      store?.restore(walletConnections);
    }
  }, [walletConnections, internalStore, store]);

  const wallets = useMemo(() => {
    return store?.wallets || internalStore.wallets;
  }, [store, internalStore]);

  const getWallets = useMemo(() => {
    return store?.getWallets || internalStore.getWallets;
  }, [store, internalStore]);

  const recentWallet = useMemo(() => {
    return store?.recentWallet || internalStore.recentWallet;
  }, [store, internalStore]);

  const providerInterface = useMemo(() => {
    const mobileConnect = async ({
      mobileProviderId,
      chainId,
      callback,
    }: {
      mobileProviderId: string;
      chainId: string;
      callback?: (walletConnection: WalletConnection) => void;
    }) => {
      const mobileProvider = availableMobileProviders.find((mobileProvider) => mobileProvider.id === mobileProviderId);
      if (!mobileProvider) {
        throw new Error(`Mobile provider ${mobileProviderId} not found`);
      }

      return mobileProvider.connect({
        chainId,
        callback: (wallet) => {
          internalStore.addWallet(wallet);
          store?.addWallet(wallet);
          if (persistent) {
            setWalletConnections(internalStore.getWallets());
          }
          callback?.(wallet);
        },
      });
    };

    const connect = async ({ providerId, chainId }: { providerId: string; chainId: string }) => {
      const provider = availableProviders.find((provider) => provider.id === providerId);
      if (!provider) {
        throw new Error(`Provider ${providerId} not found`);
      }
      const wallet = await provider.connect({ chainId });
      internalStore.addWallet(wallet);
      store?.addWallet(wallet);
      if (persistent) {
        setWalletConnections(internalStore.getWallets());
      }
    };

    const disconnect = (filters?: { providerId?: string; chainId?: string }) => {
      internalStore.getWallets(filters).forEach((wallet) => {
        const provider =
          availableProviders.find((provider) => provider.id === wallet.providerId) ||
          availableMobileProviders.find((mobileProvider) => mobileProvider.id === wallet.providerId);
        if (provider) {
          provider.disconnect({ wallet });
        }
      });

      internalStore.removeWallets(filters);
      store?.removeWallets(filters);
      if (persistent) {
        setWalletConnections(internalStore.getWallets());
      }
    };

    const simulate = async ({ messages, wallet }: { messages: TransactionMsg[]; wallet?: WalletConnection | null }) => {
      const walletToUse = wallet || recentWallet;
      if (!walletToUse) {
        throw new Error("No wallet to simulate with");
      }

      const provider =
        availableProviders.find((provider) => provider.id === walletToUse.providerId) ||
        availableMobileProviders.find((mobileProvider) => mobileProvider.id === walletToUse.providerId);

      if (!provider) {
        throw new Error(`Provider ${walletToUse.providerId} not found`);
      }

      return provider.simulate({ messages, wallet: walletToUse });
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
      wallet?: WalletConnection | null;
    }) => {
      const walletToUse = wallet || recentWallet;
      if (!walletToUse) {
        throw new Error("No wallet to broadcast with");
      }

      const provider =
        availableProviders.find((provider) => provider.id === walletToUse.providerId) ||
        availableMobileProviders.find((mobileProvider) => mobileProvider.id === walletToUse.providerId);

      if (!provider) {
        throw new Error(`Provider ${walletToUse.providerId} not found`);
      }

      return provider.broadcast({ messages, wallet: walletToUse, feeAmount, gasLimit, memo });
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
      wallet?: WalletConnection | null;
    }) => {
      const walletToUse = wallet || recentWallet;
      if (!walletToUse) {
        throw new Error("No wallet to sign with");
      }

      const provider =
        availableProviders.find((provider) => provider.id === walletToUse.providerId) ||
        availableMobileProviders.find((mobileProvider) => mobileProvider.id === walletToUse.providerId);

      if (!provider) {
        throw new Error(`Provider ${walletToUse.providerId} not found`);
      }

      return provider.sign({ messages, wallet: walletToUse, feeAmount, gasLimit, memo });
    };

    return {
      providers,
      mobileProviders,
      mobileConnect,
      connect,
      wallets,
      getWallets,
      recentWallet,
      disconnect,
      disconnectWallet: store?.removeWallet || internalStore.removeWallet,
      simulate,
      broadcast,
      sign,
    };
  }, [
    providers,
    mobileProviders,
    availableProviders,
    availableMobileProviders,
    store,
    internalStore,
    wallets,
    getWallets,
    recentWallet,
    persistent,
    setWalletConnections,
  ]);

  return <ShuttleContext.Provider value={providerInterface}>{children}</ShuttleContext.Provider>;
};

export const useShuttle = () => {
  const context = useContext(ShuttleContext);

  if (context === undefined) {
    throw new Error("Please wrap your component with ShuttleProvider to call: useShuttle");
  }

  return context;
};
