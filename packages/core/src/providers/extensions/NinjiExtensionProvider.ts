import type { Network } from "../../internals/network";
import Keplr, { type KeplrWindow } from "../../internals/adapters/extensions/Keplr";
import WalletExtensionProvider from "./WalletExtensionProvider";

declare global {
  interface Window {
    ninji?: KeplrWindow & { on: (event: string, callback: () => void) => void };
  }
}

export const NinjiExtensionProvider = class NinjiExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "ninji",
      name: "Ninji Wallet",
      networks,
      extensionProviderAdapter: new Keplr({
        name: "Ninji Wallet",
        extensionResolver() {
          return window.ninji;
        },
        setupOnUpdateEventListener(callback) {
          window.ninji?.on("accountsChanged", () => {
            callback?.();
          });
        },
      }),
    });
  }
};

export default NinjiExtensionProvider;
