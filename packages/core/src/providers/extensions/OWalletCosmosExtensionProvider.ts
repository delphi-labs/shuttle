import type { Network } from "../../internals/network";
import Keplr, { type KeplrWindow } from "../../internals/adapters/extensions/Keplr";
import WalletExtensionProvider from "./WalletExtensionProvider";

declare global {
  interface Window {
    owallet?: KeplrWindow;
  }
}

export const OWalletCosmosExtensionProvider = class OWalletCosmosExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "owallet-cosmos",
      name: "OWallet Cosmos",
      networks,
      extensionProviderAdapter: new Keplr({
        name: "Owallet",
        extensionResolver() {
          return window.owallet;
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

export default OWalletCosmosExtensionProvider;
