import type { Network } from "../../internals/network";
import Keplr, { type KeplrWindow } from "../../internals/adapters/extensions/Keplr";
import WalletExtensionProvider from "./WalletExtensionProvider";

declare global {
  interface Window {
    xfi?: {
      terra: any;
      keplr: KeplrWindow & { addListener?: (event: string, callback: () => void) => void };
    };
  }
}

export const XDEFICosmosExtensionProvider = class XDEFICosmosExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "xfi-cosmos",
      name: "XDEFI Wallet - Cosmos",
      networks,
      extensionProviderAdapter: new Keplr({
        name: "XFI",
        extensionResolver() {
          return window.xfi?.keplr;
        },
        setupOnUpdateEventListener(callback) {
          if (window.xfi?.keplr.addListener) {
            window.xfi?.keplr.addListener("accountsChanged", () => {
              callback?.();
            });
          }
        },
      }),
    });
  }
};

export default XDEFICosmosExtensionProvider;
