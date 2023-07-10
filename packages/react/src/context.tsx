"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import useLocalStorageState from "use-local-storage-state";

import {
  WalletMobileProvider,
  WalletExtensionProvider,
  WalletConnection,
  MobileConnectResponse,
  TransactionMsg,
  SimulateResult,
  BroadcastResult,
  SigningResult,
} from "@delphi-labs/shuttle";

import { ShuttleStore, useShuttleStore } from "./store";

export type ShuttleContextType = {
  extensionProviders: WalletExtensionProvider[];
  mobileProviders: WalletMobileProvider[];
  mobileConnect: (options: {
    mobileProviderId: string;
    chainId: string;
    callback?: (walletConnection: WalletConnection) => void;
  }) => Promise<MobileConnectResponse>;
  connect: (options: { extensionProviderId: string; chainId: string }) => Promise<WalletConnection>;
  wallets: WalletConnection[];
  getWallets: (filters?: { providerId?: string; chainId?: string }) => WalletConnection[];
  recentWallet: WalletConnection | null;
  disconnect: (filters?: { providerId?: string; chainId?: string }) => void;
  disconnectWallet: (wallet: WalletConnection) => void;
  simulate: (options: { messages: TransactionMsg[]; wallet?: WalletConnection | null }) => Promise<SimulateResult>;
  broadcast: (options: {
    messages: TransactionMsg[];
    wallet?: WalletConnection | null;
    feeAmount?: string | null;
    gasLimit?: string | null;
    memo?: string | null;
    overrides?: {
      rpc?: string;
      rest?: string;
    };
  }) => Promise<BroadcastResult>;
  sign: (options: {
    messages: TransactionMsg[];
    feeAmount?: string | null;
    gasLimit?: string | null;
    memo?: string | null;
    wallet?: WalletConnection | null;
  }) => Promise<SigningResult>;
  signArbitrary: (options: { wallet?: WalletConnection | null; data: Uint8Array }) => Promise<SigningResult>;
  verifyArbitrary: (options: {
    wallet?: WalletConnection | null;
    data: Uint8Array;
    signResult: SigningResult;
  }) => Promise<boolean>;
};

export const ShuttleContext = createContext<ShuttleContextType | undefined>(undefined);

export function ShuttleProvider({
  persistent = false,
  persistentKey = "shuttle",
  extensionProviders,
  mobileProviders = [],
  store,
  children,
  withLogging = false,
  walletConnectProjectId,
}: {
  persistent?: boolean;
  persistentKey?: string;
  extensionProviders: WalletExtensionProvider[];
  mobileProviders: WalletMobileProvider[];
  store?: ShuttleStore;
  children?: React.ReactNode;
  withLogging?: boolean;
  walletConnectProjectId?: string;
}) {
  const [availableExtensionProviders, setAvailableExtensionProviders] = useState<WalletExtensionProvider[]>([]);
  const [availableMobileProviders, setAvailableMobileProviders] = useState<WalletMobileProvider[]>([]);

  const internalStore = useShuttleStore();
  const [walletConnections, setWalletConnections] = useLocalStorageState<WalletConnection[]>(
    persistentKey || "shuttle",
    { defaultValue: [] },
  );

  const wallets = useMemo(() => {
    return store?.wallets || internalStore.wallets;
  }, [store, internalStore]);

  const getWallets = useMemo(() => {
    return store?.getWallets || internalStore.getWallets;
  }, [store, internalStore]);

  const recentWallet = useMemo(() => {
    return store?.recentWallet || internalStore.recentWallet;
  }, [store, internalStore]);

  const addWallet = useCallback(
    (wallet: WalletConnection) => {
      internalStore.addWallet(wallet);
      store?.addWallet(wallet);
      if (persistent) {
        setWalletConnections(internalStore.getWallets());
      }
    },
    [internalStore, persistent, setWalletConnections, store],
  );

  const removeWallets = useCallback(
    (filters?: { providerId?: string; chainId?: string }) => {
      internalStore.removeWallets(filters);
      store?.removeWallets(filters);
      if (persistent) {
        setWalletConnections(internalStore.getWallets());
      }
    },
    [internalStore, persistent, setWalletConnections, store],
  );

  const removeWallet = useCallback(
    (wallet: WalletConnection) => {
      internalStore.removeWallet(wallet);
      store?.removeWallet(wallet);
      if (persistent) {
        setWalletConnections(internalStore.getWallets());
      }
    },
    [internalStore, persistent, setWalletConnections, store],
  );

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
          addWallet(wallet);
          callback?.(wallet);
        },
      });
    };

    const connect = async ({
      extensionProviderId,
      chainId,
    }: {
      extensionProviderId: string;
      chainId: string;
    }): Promise<WalletConnection> => {
      const provider = availableExtensionProviders.find(
        (extensionProvider) => extensionProvider.id === extensionProviderId,
      );
      if (!provider) {
        throw new Error(`Provider ${extensionProviderId} not found`);
      }
      const wallet = await provider.connect({ chainId });

      addWallet(wallet);
      return wallet;
    };

    const disconnect = (filters?: { providerId?: string; chainId?: string }) => {
      internalStore.getWallets(filters).forEach((wallet) => {
        const provider =
          availableExtensionProviders.find((extensionProvider) => extensionProvider.id === wallet.providerId) ||
          availableMobileProviders.find((mobileProvider) => mobileProvider.id === wallet.providerId);
        if (provider) {
          provider.disconnect({ wallet });
        }
      });

      removeWallets(filters);
    };

    const disconnectWallet = (wallet: WalletConnection) => {
      const provider =
        availableExtensionProviders.find((extensionProvider) => extensionProvider.id === wallet.providerId) ||
        availableMobileProviders.find((mobileProvider) => mobileProvider.id === wallet.providerId);

      if (provider) {
        provider.disconnect({ wallet });
      }

      removeWallet(wallet);
    };

    const simulate = async ({ messages, wallet }: { messages: TransactionMsg[]; wallet?: WalletConnection | null }) => {
      const walletToUse = wallet || recentWallet;
      if (!walletToUse) {
        throw new Error("No wallet to simulate with");
      }

      const provider =
        availableExtensionProviders.find((extensionProvider) => extensionProvider.id === walletToUse.providerId) ||
        availableMobileProviders.find((mobileProvider) => mobileProvider.id === walletToUse.providerId);

      if (!provider) {
        throw new Error(`Provider ${walletToUse.providerId} not found`);
      }

      return provider.simulate({ messages, wallet: walletToUse });
    };

    const broadcast = async ({
      messages,
      wallet,
      feeAmount,
      gasLimit,
      memo,
      overrides,
    }: {
      messages: TransactionMsg[];
      wallet?: WalletConnection | null;
      feeAmount?: string | null;
      gasLimit?: string | null;
      memo?: string | null;
      overrides?: {
        rpc?: string;
        rest?: string;
      };
    }) => {
      const walletToUse = wallet || recentWallet;
      if (!walletToUse) {
        throw new Error("No wallet to broadcast with");
      }

      const provider =
        availableExtensionProviders.find((extensionProvider) => extensionProvider.id === walletToUse.providerId) ||
        availableMobileProviders.find((mobileProvider) => mobileProvider.id === walletToUse.providerId);

      if (!provider) {
        throw new Error(`Provider ${walletToUse.providerId} not found`);
      }

      return provider.broadcast({ messages, wallet: walletToUse, feeAmount, gasLimit, memo, overrides });
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
        availableExtensionProviders.find((extensionProvider) => extensionProvider.id === walletToUse.providerId) ||
        availableMobileProviders.find((mobileProvider) => mobileProvider.id === walletToUse.providerId);

      if (!provider) {
        throw new Error(`Provider ${walletToUse.providerId} not found`);
      }

      return provider.sign({ messages, wallet: walletToUse, feeAmount, gasLimit, memo });
    };

    const signArbitrary = async ({ wallet, data }: { wallet?: WalletConnection | null; data: Uint8Array }) => {
      const walletToUse = wallet || recentWallet;
      if (!walletToUse) {
        throw new Error("No wallet to sign with");
      }

      const provider =
        availableExtensionProviders.find((extensionProvider) => extensionProvider.id === walletToUse.providerId) ||
        availableMobileProviders.find((mobileProvider) => mobileProvider.id === walletToUse.providerId);

      if (!provider) {
        throw new Error(`Provider ${walletToUse.providerId} not found`);
      }

      return provider.signArbitrary({ wallet: walletToUse, data });
    };

    const verifyArbitrary = async ({
      wallet,
      data,
      signResult,
    }: {
      wallet?: WalletConnection | null;
      data: Uint8Array;
      signResult: SigningResult;
    }) => {
      const walletToUse = wallet || recentWallet;
      if (!walletToUse) {
        throw new Error("No wallet to sign with");
      }

      const provider =
        availableExtensionProviders.find((extensionProvider) => extensionProvider.id === walletToUse.providerId) ||
        availableMobileProviders.find((mobileProvider) => mobileProvider.id === walletToUse.providerId);

      if (!provider) {
        throw new Error(`Provider ${walletToUse.providerId} not found`);
      }

      return provider.verifyArbitrary({ wallet: walletToUse, data, signResult });
    };

    return {
      extensionProviders,
      mobileProviders,
      mobileConnect,
      connect,
      wallets,
      getWallets,
      recentWallet,
      disconnect,
      disconnectWallet,
      simulate,
      broadcast,
      sign,
      signArbitrary,
      verifyArbitrary,
    };
  }, [
    extensionProviders,
    mobileProviders,
    wallets,
    getWallets,
    recentWallet,
    availableMobileProviders,
    internalStore,
    availableExtensionProviders,
    addWallet,
    removeWallets,
    removeWallet,
  ]);

  const updateExtensionWallets = (extensionProvider: WalletExtensionProvider) => {
    getWallets({ providerId: extensionProvider.id }).forEach((extensionProviderWallet) => {
      extensionProvider
        .connect({ chainId: extensionProviderWallet.network.chainId })
        .then((wallet) => {
          if (extensionProviderWallet.id !== wallet.id) {
            removeWallet(extensionProviderWallet);
            addWallet(wallet);
          }
        })
        .catch(() => {
          removeWallet(extensionProviderWallet);
        });
    });
  };

  const updateMobileWallets = (mobileProvider: WalletMobileProvider) => {
    getWallets({ providerId: mobileProvider.id }).forEach((mobileProviderWallet) => {
      if (!mobileProviderWallet.mobileSession) {
        return;
      }
      mobileProvider
        .getWalletConnection({
          chainId: mobileProviderWallet.network.chainId,
          mobileSession: mobileProviderWallet.mobileSession,
        })
        .then((wallet) => {
          if (mobileProviderWallet.id !== wallet.id) {
            removeWallet(mobileProviderWallet);
            addWallet(wallet);
          }
        })
        .catch(() => {
          removeWallet(mobileProviderWallet);
        });
    });
  };

  // Initialize store
  useEffect(() => {
    if (walletConnections && walletConnections.length > 0 && internalStore.getWallets().length === 0) {
      internalStore.restore(walletConnections);
      store?.restore(walletConnections);
    }
  }, [walletConnections, internalStore, store]);

  // Initialize providers
  useEffect(() => {
    extensionProviders
      .filter((extensionProvider) => !extensionProvider.initializing && !extensionProvider.initialized)
      .forEach((extensionProvider) => {
        extensionProvider
          .init()
          .then(() => {
            updateExtensionWallets(extensionProvider);

            extensionProvider.setOnUpdateCallback(() => {
              updateExtensionWallets(extensionProvider);
            });

            setAvailableExtensionProviders((prev) => {
              const rest = prev.filter((p) => p.id !== extensionProvider.id);
              return [...rest, extensionProvider];
            });
          })
          .catch((e) => {
            if (withLogging) {
              console.warn("Shuttle: ", e);
            }
          });
      });

    mobileProviders
      .filter((mobileProvider) => !mobileProvider.initializing && !mobileProvider.initialized)
      .forEach((mobileProvider) => {
        mobileProvider
          .init({ walletConnectProjectId })
          .then(() => {
            updateMobileWallets(mobileProvider);

            mobileProvider.setOnUpdateCallback(() => {
              updateMobileWallets(mobileProvider);
            });

            setAvailableMobileProviders((prev) => {
              const rest = prev.filter((p) => p.id !== mobileProvider.id);
              return [...rest, mobileProvider];
            });
          })
          .catch((e) => {
            if (withLogging) {
              console.warn("Shuttle: ", e);
            }
          });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <ShuttleContext.Provider value={providerInterface}>{children}</ShuttleContext.Provider>;
}

export function useShuttle() {
  const context = useContext(ShuttleContext);

  if (context === undefined) {
    throw new Error("Please wrap your component with ShuttleProvider to call: useShuttle");
  }

  return context;
}
