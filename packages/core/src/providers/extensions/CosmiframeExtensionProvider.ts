import type { Network } from "../../internals/network";
import WalletExtensionProvider from "./WalletExtensionProvider";
import Cosmiframe from "../../internals/adapters/extensions/Cosmiframe";

export const CosmiframeExtensionProvider = class CosmiframeExtensionProvider extends WalletExtensionProvider {
  constructor({ networks, allowedParentOrigins }: { networks: Network[]; allowedParentOrigins: string[] }) {
    super({
      id: "cosmiframe",
      name: "Cosmiframe",
      networks,
      extensionProviderAdapter: new Cosmiframe({
        allowedParentOrigins,
      }),
    });
  }
};

export default CosmiframeExtensionProvider;
