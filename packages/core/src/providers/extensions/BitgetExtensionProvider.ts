import type { Network } from "../../internals/network";
import Keplr, { type KeplrWindow } from "../../internals/adapters/extensions/Keplr";
import WalletExtensionProvider from "./WalletExtensionProvider";

declare global {
  interface Window {
    bitkeep?: {
      keplr: KeplrWindow;
    };
  }
}

export const BitgetExtensionProvider = class BitgetExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "bitget",
      name: "Bitget",
      networks,
      extensionProviderAdapter: new Keplr({
        extensionResolver() {
          return window.bitkeep?.keplr;
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

export default BitgetExtensionProvider;
