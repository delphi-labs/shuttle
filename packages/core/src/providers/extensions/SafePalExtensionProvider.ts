import type { Network } from "../../internals/network";
import Keplr, { type KeplrWindow } from "../../internals/adapters/extensions/Keplr";
import WalletExtensionProvider from "./WalletExtensionProvider";

declare global {
  interface Window {
    safepal?: {
      keplr?: KeplrWindow;
    };
  }
}

export const SafePalExtensionProvider = class SafePalExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "safepal",
      name: "SafePal",
      networks,
      extensionProviderAdapter: new Keplr({
        name: "SafePal",
        extensionResolver() {
          return window.safepal?.keplr;
        },
        setupOnUpdateEventListener(callback) {
          window.addEventListener("safepal_keystorechange", () => {
            callback?.();
          });
        },
      }),
    });
  }
};

export default SafePalExtensionProvider;
