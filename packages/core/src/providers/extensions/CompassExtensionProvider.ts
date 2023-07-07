import type { Network } from "../../internals/network";
import Keplr, { type KeplrWindow } from "../../internals/adapters/extensions/Keplr";
import WalletExtensionProvider from "./WalletExtensionProvider";

declare global {
  interface Window {
    compass?: KeplrWindow;
  }
}

export const CompassExtensionProvider = class CompassExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "compass",
      name: "Compass",
      networks,
      extensionProviderAdapter: new Keplr({
        name: "Compass",
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

export const CompassProvider = CompassExtensionProvider;

export default CompassExtensionProvider;
