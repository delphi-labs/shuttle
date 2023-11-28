import type { Network } from "../../internals/network";
import Keplr, { type KeplrWindow } from "../../internals/adapters/extensions/Keplr";
import WalletExtensionProvider from "./WalletExtensionProvider";

declare global {
  interface Window {
    okxwallet?: {
      keplr?: KeplrWindow;
    };
  }
}

export const OkxWalletExtensionProvider = class OkxWalletExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "okx-wallet",
      name: "OKX Wallet",
      networks,
      extensionProviderAdapter: new Keplr({
        name: "OKX Wallet",
        extensionResolver() {
          return window.okxwallet?.keplr;
        },
        setupOnUpdateEventListener(callback) {
          window.addEventListener("okxwallet_keystorechange", () => {
            callback?.();
          });
        },
      }),
    });
  }
};

export default OkxWalletExtensionProvider;
