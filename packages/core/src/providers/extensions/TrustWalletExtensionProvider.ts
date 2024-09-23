import type { Network } from "../../internals/network";
import Keplr, { type KeplrWindow } from "../../internals/adapters/extensions/Keplr";
import WalletExtensionProvider from "./WalletExtensionProvider";

declare global {
  interface Window {
    trustwallet?: {
      keplr?: KeplrWindow;
    };
  }
}

export const TrustWalletExtensionProvider = class TrustWalletExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "trustwallet",
      name: "TrustWallet",
      networks,
      extensionProviderAdapter: new Keplr({
        name: "TrustWallet",
        extensionResolver() {
          return window.trustwallet?.keplr;
        },
        setupOnUpdateEventListener(callback) {
          window.addEventListener("trustwallet_keystorechange", () => {
            callback?.();
          });
        },
      }),
    });
  }
};

export default TrustWalletExtensionProvider;
