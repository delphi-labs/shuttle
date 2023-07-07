import type { Network } from "../../internals/network";
import Keplr, { type KeplrWindow } from "../../internals/adapters/extensions/Keplr";
import WalletExtensionProvider from "./WalletExtensionProvider";

declare global {
  interface Window {
    keplr?: KeplrWindow;
  }
}

export const KeplrExtensionProvider = class KeplrExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "keplr",
      name: "Keplr",
      networks,
      extensionProviderAdapter: new Keplr({
        extensionResolver() {
          return window.keplr;
        },
        setupOnUpdateEventListener(callback) {
          window.addEventListener("keplr_keystorechange", () => {
            callback?.();
          });
        },
      }),
    });
  }
};

export const KeplrProvider = KeplrExtensionProvider;

export default KeplrExtensionProvider;
