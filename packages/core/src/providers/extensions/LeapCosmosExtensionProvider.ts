import type { Network } from "../../internals/network";
import Keplr, { type KeplrWindow } from "../../internals/adapters/extensions/Keplr";
import WalletExtensionProvider from "./WalletExtensionProvider";

declare global {
  interface Window {
    leap?: KeplrWindow;
  }
}

export const LeapCosmosExtensionProvider = class LeapCosmosExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "leap-cosmos",
      name: "Leap Cosmos",
      networks,
      extensionProviderAdapter: new Keplr({
        name: "Leap",
        extensionResolver() {
          return window.leap;
        },
        setupOnUpdateEventListener(callback) {
          window.addEventListener("leap_keystorechange", () => {
            callback?.();
          });
        },
      }),
    });
  }
};

export default LeapCosmosExtensionProvider;
