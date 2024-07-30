import type { Network } from "../../internals/network";
import Keplr, { type KeplrWindow } from "../../internals/adapters/extensions/Keplr";
import WalletExtensionProvider from "./WalletExtensionProvider";

declare global {
  interface Window {
    imToken?: KeplrWindow;
  }
}

export const imTokenExtensionProvider = class imTokenExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "imToken",
      name: "imToken",
      networks,
      extensionProviderAdapter: new Keplr({
        name: "imToekn",
        extensionResolver() {
          return window.keplr;
        },
        setupOnUpdateEventListener(callback) {
          window.addEventListener("imToken_keystorechange", () => {
            callback?.();
          });
        },
      }),
    });
  }
};

export default imTokenExtensionProvider;
