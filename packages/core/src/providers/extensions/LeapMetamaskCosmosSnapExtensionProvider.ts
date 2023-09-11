import type { Network } from "../../internals/network";
import MetamaskCosmosSnap from "../../internals/adapters/extensions/MetamaskCosmosSnap";
import WalletExtensionProvider from "./WalletExtensionProvider";

export const LeapMetamaskCosmosSnapExtensionProvider = class LeapMetamaskCosmosSnapExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "leap-metamask-cosmos-snap",
      name: "Leap Metamask Cosmos Snap",
      networks,
      extensionProviderAdapter: new MetamaskCosmosSnap({
        snapId: "npm:@leapwallet/metamask-cosmos-snap",
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

export default LeapMetamaskCosmosSnapExtensionProvider;
