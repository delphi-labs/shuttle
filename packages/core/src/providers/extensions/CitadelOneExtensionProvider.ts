import type { Network } from "../../internals/network";
import Keplr, { type KeplrWindow } from "../../internals/adapters/extensions/Keplr";
import WalletExtensionProvider from "./WalletExtensionProvider";

declare global {
  interface Window {
    citadelone?: {
      keplr?: KeplrWindow;
    };
  }
}

export const CitadelOneExtensionProvider = class CitadelOneExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "citadelone",
      name: "CitadelOne",
      networks,
      extensionProviderAdapter: new Keplr({
        name: "CitadelOne",
        extensionResolver() {
          return window.citadelone?.keplr;
        },
        setupOnUpdateEventListener(callback) {
          window.addEventListener("citadelone_keystorechange", () => {
            callback?.();
          });
        },
      }),
    });
  }
};

export default CitadelOneExtensionProvider;
