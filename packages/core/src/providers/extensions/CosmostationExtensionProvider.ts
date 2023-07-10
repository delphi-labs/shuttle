import type { Network } from "../../internals/network";
import Keplr, { type KeplrWindow } from "../../internals/adapters/extensions/Keplr";
import WalletExtensionProvider from "./WalletExtensionProvider";

interface Cosmostation {
  cosmos: {
    on(event: string, callback: () => void): void;
  };
  providers: {
    keplr: KeplrWindow;
  };
}

declare global {
  interface Window {
    cosmostation?: Cosmostation;
  }
}

export const CosmostationExtensionProvider = class CosmostationExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "cosmostation",
      name: "Cosmostation",
      networks,
      extensionProviderAdapter: new Keplr({
        name: "Cosmostation",
        extensionResolver() {
          return window.cosmostation?.providers?.keplr;
        },
        setupOnUpdateEventListener(callback) {
          window.cosmostation?.cosmos.on("accountChanged", () => {
            callback?.();
          });
        },
      }),
    });
  }
};

export default CosmostationExtensionProvider;
