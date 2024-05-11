import { WalletExtensionProvider } from "../../../providers";
import { Keplr } from "./Keplr";
import { Cosmiframe as CosmiframeClient } from "@dao-dao/cosmiframe";

export class Cosmiframe extends Keplr {
  cosmiframe: CosmiframeClient;

  constructor({ allowedParentOrigins }: { allowedParentOrigins: string[] }) {
    const cosmiframe = new CosmiframeClient(allowedParentOrigins);

    super({
      name: "Cosmiframe",
      useExperimentalSuggestChain: true,
      extensionResolver: cosmiframe.getKeplrClient,
      setupOnUpdateEventListener: () => {
        // N/A
      },
    });

    this.cosmiframe = cosmiframe;
  }

  async init(provider: WalletExtensionProvider): Promise<void> {
    const ready = await this.cosmiframe.isReady();
    if (!ready) {
      throw new Error("Cosmiframe is not available");
    }

    super.init(provider);
  }
}

export default Cosmiframe;
