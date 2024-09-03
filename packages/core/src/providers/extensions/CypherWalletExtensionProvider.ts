import type { Network } from "../../internals/network";
import Keplr, { type KeplrWindow } from "../../internals/adapters/extensions/Keplr";
import WalletExtensionProvider from "./WalletExtensionProvider";

declare global {
  interface Window {
    cypherwallet?: {
      keplr?: KeplrWindow;
    };
  }
}

export const CypherWalletExtensionProvider = class CypherWalletExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "cypherwallet",
      name: "CypherWallet",
      networks,
      extensionProviderAdapter: new Keplr({
        name: "CypherWallet",
        extensionResolver() {
          return window.cypherwallet?.keplr;
        },
        setupOnUpdateEventListener(callback) {
          window.addEventListener("cypherwallet_keystorechange", () => {
            callback?.();
          });
        },
      }),
    });
  }
};

export default CypherWalletExtensionProvider;
