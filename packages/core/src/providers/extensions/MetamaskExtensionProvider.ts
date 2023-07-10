import type { Network } from "../../internals/network";
import Metamask, { type EthereumWindow } from "../../internals/adapters/extensions/Metamask";
import WalletExtensionProvider from "./WalletExtensionProvider";

declare global {
  interface Window {
    ethereum?: EthereumWindow & {
      on: (event: string, callback: (data: any) => void) => void;
    };
  }
}

export const MetamaskExtensionProvider = class MetamaskExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "metamask",
      name: "Metamask",
      networks,
      extensionProviderAdapter: new Metamask({
        extensionResolver() {
          if (!window.ethereum || !window.ethereum.isMetaMask) {
            throw new Error("Metamask is not available");
          }
          return window.ethereum;
        },
        setupOnUpdateEventListener(callback) {
          window.ethereum?.on("accountsChanged", () => {
            callback?.();
          });
        },
      }),
    });
  }
};

export default MetamaskExtensionProvider;
