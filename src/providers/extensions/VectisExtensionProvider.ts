import type { Network } from "../../internals/network";
import { Vectis, IVectisCosmosProvider } from "../../internals/adapters/extensions/Vectis";
import WalletExtensionProvider from "./WalletExtensionProvider";

declare global {
  interface Window {
    vectis?: {
      version: string;
      cosmos: IVectisCosmosProvider;
    };
  }
}

export const VectisCosmosExtensionProvider = class VectisCosmosExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "vectis-cosmos",
      name: "Vectis Cosmos",
      networks,
      extensionProviderAdapter: new Vectis({
        name: "Vectis",
        extensionResolver() {
          return window.vectis?.cosmos;
        },
        setupOnUpdateEventListener(callback) {
          window.addEventListener("vectis_accountChanged", () => {
            callback?.();
          });
        },
      }),
    });
  }
};

export const VectisCosmosProvider = VectisCosmosExtensionProvider;

export default VectisCosmosExtensionProvider;
