import type { Network } from "../../internals/network";
import Keplr, { type KeplrWindow } from "../../internals/adapters/extensions/Keplr";
import WalletExtensionProvider from "./WalletExtensionProvider";

declare global {
  interface Window {
    fin?: KeplrWindow;
  }
}

export const FinExtensionProvider = class FinExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "fin",
      name: "Fin",
      networks,
      extensionProviderAdapter: new Keplr({
        name: "Fin",
        useExperimentalSuggestChain: false,
        extensionResolver() {
          return window.compass;
        },
        setupOnUpdateEventListener(_callback) {
          // @TODO - add support for wallet change
        },
      }),
    });
  }
};

export const FinProvider = FinExtensionProvider;

export default FinExtensionProvider;
