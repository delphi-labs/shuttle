import { App, Ref, inject, ref } from "vue";
import { Pinia } from "pinia";
import {
  BroadcastResult,
  MobileConnectResponse,
  NetworkCurrency,
  SigningResult,
  SimulateResult,
  TransactionMsg,
  WalletConnection,
  WalletExtensionProvider,
  WalletMobileProvider,
} from "@delphi-labs/shuttle";

import { ShuttleStore, useShuttleStore } from "./store";

declare module "vue" {
  interface ComponentCustomProperties {
    $shuttle: Shuttle;
  }
}

export type ShuttleVuePlugin = {
  install: (app: App) => void;
};

export type Shuttle = {
  $store: ShuttleStore;
  extensionProviders: WalletExtensionProvider[];
  availableExtensionProviders: WalletExtensionProvider[];
  mobileProviders: WalletMobileProvider[];
  availableMobileProviders: WalletMobileProvider[];
  mobileConnect: (options: {
    mobileProviderId: string;
    chainId: string;
    callback?: (walletConnection: WalletConnection) => void;
  }) => Promise<MobileConnectResponse>;
  connect: (options: { extensionProviderId: string; chainId: string }) => Promise<WalletConnection>;
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
      gasAdjustment?: number;
      gasPrice?: string;
      feeCurrency?: NetworkCurrency;
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

export const ShuttleSymbol = Symbol();

export function createShuttle({
  pinia,
  extensionProviders = [],
  mobileProviders = [],
  walletConnectProjectId = "",
  withLogging = false,
}: {
  pinia?: Pinia;
  extensionProviders?: WalletExtensionProvider[];
  mobileProviders?: WalletMobileProvider[];
  walletConnectProjectId?: string;
  withLogging?: boolean;
}): ShuttleVuePlugin {
  return {
    install(app: App) {
      const store = useShuttleStore(pinia);
      const availableExtensionProviders: Ref<WalletExtensionProvider[]> = ref([]);
      const availableMobileProviders: Ref<WalletMobileProvider[]> = ref([]);

      const shuttle: Shuttle = {
        $store: store,
        extensionProviders,
        availableExtensionProviders: availableExtensionProviders.value,
        mobileProviders,
        availableMobileProviders: availableMobileProviders.value,
        connect: async ({
          extensionProviderId,
          chainId,
        }: {
          extensionProviderId: string;
          chainId: string;
        }): Promise<WalletConnection> => {
          const provider = availableExtensionProviders.value.find(
            (extensionProvider) => extensionProvider.id === extensionProviderId,
          );
          if (!provider) {
            throw new Error(`Provider ${extensionProviderId} not found`);
          }
          const wallet = await provider.connect({ chainId });

          store.addWallet(wallet);

          return wallet;
        },
        mobileConnect: async ({
          mobileProviderId,
          chainId,
          callback,
        }: {
          mobileProviderId: string;
          chainId: string;
          callback?: (walletConnection: WalletConnection) => void;
        }) => {
          const mobileProvider = availableMobileProviders.value.find(
            (mobileProvider) => mobileProvider.id === mobileProviderId,
          );
          if (!mobileProvider) {
            throw new Error(`Mobile provider ${mobileProviderId} not found`);
          }

          return mobileProvider.connect({
            chainId,
            callback: (wallet) => {
              store.addWallet(wallet);
              callback?.(wallet);
            },
          });
        },
        disconnect: (filters?: { providerId?: string; chainId?: string }) => {
          store.getWallets(filters).forEach((wallet) => {
            const provider =
              availableExtensionProviders.value.find(
                (extensionProvider) => extensionProvider.id === wallet.providerId,
              ) || availableMobileProviders.value.find((mobileProvider) => mobileProvider.id === wallet.providerId);
            if (provider) {
              provider.disconnect({ wallet });
            }
          });

          store.removeWallets(filters);
        },
        disconnectWallet: (wallet: WalletConnection) => {
          const provider =
            availableExtensionProviders.value.find((extensionProvider) => extensionProvider.id === wallet.providerId) ||
            availableMobileProviders.value.find((mobileProvider) => mobileProvider.id === wallet.providerId);

          if (provider) {
            provider.disconnect({ wallet });
          }

          store.removeWallet(wallet);
        },
        simulate: async ({
          messages,
          wallet,
          overrides,
        }: {
          messages: TransactionMsg[];
          wallet?: WalletConnection | null;
          overrides?: {
            rpc?: string;
            rest?: string;
            gasAdjustment?: number;
            gasPrice?: string;
            feeCurrency?: NetworkCurrency;
          };
        }) => {
          const walletToUse = wallet || store.recentWallet;
          if (!walletToUse) {
            throw new Error("No wallet to simulate with");
          }

          const provider =
            availableExtensionProviders.value.find(
              (extensionProvider) => extensionProvider.id === walletToUse.providerId,
            ) || availableMobileProviders.value.find((mobileProvider) => mobileProvider.id === walletToUse.providerId);

          if (!provider) {
            throw new Error(`Provider ${walletToUse.providerId} not found`);
          }

          return provider.simulate({ messages, wallet: walletToUse, overrides });
        },
        broadcast: async ({
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
            gasAdjustment?: number;
            gasPrice?: string;
            feeCurrency?: NetworkCurrency;
          };
        }) => {
          const walletToUse = wallet || store.recentWallet;
          if (!walletToUse) {
            throw new Error("No wallet to broadcast with");
          }

          const provider =
            availableExtensionProviders.value.find(
              (extensionProvider) => extensionProvider.id === walletToUse.providerId,
            ) || availableMobileProviders.value.find((mobileProvider) => mobileProvider.id === walletToUse.providerId);

          if (!provider) {
            throw new Error(`Provider ${walletToUse.providerId} not found`);
          }

          return provider.broadcast({ messages, wallet: walletToUse, feeAmount, gasLimit, memo, overrides });
        },
        sign: async ({
          messages,
          feeAmount,
          gasLimit,
          memo,
          wallet,
          overrides,
        }: {
          messages: TransactionMsg[];
          feeAmount?: string | null;
          gasLimit?: string | null;
          memo?: string | null;
          wallet?: WalletConnection | null;
          overrides?: {
            rpc?: string;
            rest?: string;
            gasAdjustment?: number;
            gasPrice?: string;
            feeCurrency?: NetworkCurrency;
          };
        }) => {
          const walletToUse = wallet || store.recentWallet;
          if (!walletToUse) {
            throw new Error("No wallet to sign with");
          }

          const provider =
            availableExtensionProviders.value.find(
              (extensionProvider) => extensionProvider.id === walletToUse.providerId,
            ) || availableMobileProviders.value.find((mobileProvider) => mobileProvider.id === walletToUse.providerId);

          if (!provider) {
            throw new Error(`Provider ${walletToUse.providerId} not found`);
          }

          return provider.sign({ messages, wallet: walletToUse, feeAmount, gasLimit, memo, overrides });
        },
        signArbitrary: async ({ wallet, data }: { wallet?: WalletConnection | null; data: Uint8Array }) => {
          const walletToUse = wallet || store.recentWallet;
          if (!walletToUse) {
            throw new Error("No wallet to sign with");
          }

          const provider =
            availableExtensionProviders.value.find(
              (extensionProvider) => extensionProvider.id === walletToUse.providerId,
            ) || availableMobileProviders.value.find((mobileProvider) => mobileProvider.id === walletToUse.providerId);

          if (!provider) {
            throw new Error(`Provider ${walletToUse.providerId} not found`);
          }

          return provider.signArbitrary({ wallet: walletToUse, data });
        },
        verifyArbitrary: async ({
          wallet,
          data,
          signResult,
        }: {
          wallet?: WalletConnection | null;
          data: Uint8Array;
          signResult: SigningResult;
        }) => {
          const walletToUse = wallet || store.recentWallet;
          if (!walletToUse) {
            throw new Error("No wallet to sign with");
          }

          const provider =
            availableExtensionProviders.value.find(
              (extensionProvider) => extensionProvider.id === walletToUse.providerId,
            ) || availableMobileProviders.value.find((mobileProvider) => mobileProvider.id === walletToUse.providerId);

          if (!provider) {
            throw new Error(`Provider ${walletToUse.providerId} not found`);
          }

          return provider.verifyArbitrary({ wallet: walletToUse, data, signResult });
        },
      };

      const updateExtensionWallets = (extensionProvider: WalletExtensionProvider) => {
        store.getWallets({ providerId: extensionProvider.id }).forEach((extensionProviderWallet) => {
          extensionProvider
            .connect({ chainId: extensionProviderWallet.network.chainId })
            .then((wallet) => {
              if (extensionProviderWallet.id !== wallet.id) {
                store.removeWallet(extensionProviderWallet);
                store.addWallet(wallet);
              }
            })
            .catch(() => {
              store.removeWallet(extensionProviderWallet);
            });
        });
      };

      // Force delay to let extensions inject into window
      setTimeout(() => {
        extensionProviders.forEach((extensionProvider) => {
          extensionProvider
            .init()
            .then(() => {
              updateExtensionWallets(extensionProvider);

              extensionProvider.setOnUpdateCallback(() => {
                updateExtensionWallets(extensionProvider);
              });

              availableExtensionProviders.value.push(extensionProvider);
            })
            .catch((e) => {
              if (withLogging) {
                console.warn("Shuttle: ", e);
              }
            });
        });
      }, 500);

      const updateMobileWallets = (mobileProvider: WalletMobileProvider) => {
        store.getWallets({ providerId: mobileProvider.id }).forEach((mobileProviderWallet) => {
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
                store.removeWallet(mobileProviderWallet);
                store.addWallet(wallet);
              }
            })
            .catch(() => {
              store.removeWallet(mobileProviderWallet);
            });
        });
      };

      mobileProviders.forEach((mobileProvider) => {
        mobileProvider
          .init({
            walletConnectProjectId,
          })
          .then(() => {
            updateMobileWallets(mobileProvider);

            mobileProvider.setOnUpdateCallback(() => {
              updateMobileWallets(mobileProvider);
            });

            availableMobileProviders.value.push(mobileProvider);
          })
          .catch((e) => {
            if (withLogging) {
              console.warn("Shuttle: ", e);
            }
          });
      });

      // make $shuttle available to all
      // components using Options API
      app.config.globalProperties.$shuttle = shuttle;

      // provide shuttle to support all components
      // using Composition API or Options API
      app.provide(ShuttleSymbol, shuttle);
    },
  };
}

export function useShuttle(): Shuttle {
  const shuttle = inject(ShuttleSymbol);
  if (!shuttle) {
    throw new Error("Shuttle not provided!");
  }

  return shuttle as Shuttle;
}
