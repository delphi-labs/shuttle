import type { Network } from "../../internals/network";
import Keplr, { type KeplrWindow } from "../../internals/adapters/extensions/Keplr";
import WalletExtensionProvider from "./WalletExtensionProvider";

declare global {
  interface Window {
    math?: {
      keplr?: KeplrWindow;
    };
  }
}

export const MathExtensionProvider = class MathExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "math",
      name: "Math",
      networks,
      extensionProviderAdapter: new Keplr({
        name: "Math",
        extensionResolver() {
          return window.math?.keplr;
        },
        setupOnUpdateEventListener(callback) {
          window.addEventListener("math_keystorechange", () => {
            callback?.();
          });
        },
      }),
    });
  }
};

export default MathExtensionProvider;
