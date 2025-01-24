import type { Network } from "../../internals/network";
import Keplr, { type KeplrWindow } from "../../internals/adapters/extensions/Keplr";
import type { WalletConnection } from "../../internals/wallet";
import WalletExtensionProvider from "./WalletExtensionProvider";
import { EthSignType, SigningResult } from "../../internals";

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

  signEthereum = async ({
    wallet,
    data,
    type,
  }: {
    wallet: WalletConnection;
    data: Uint8Array | string;
    type: EthSignType;
  }): Promise<SigningResult> => {
    if (!this.extensionProviderAdapter.isReady()) {
      throw new Error(`${this.name} is not available`);
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const currentWallet = await this.connect({ chainId: network.chainId });

    if (currentWallet.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    const signature = await (this.extensionProviderAdapter as Keplr).signEthereum(this, {
      chainId: network.chainId,
      signer: wallet.account.address,
      data,
      type,
    });

    return {
      signatures: [signature],
      response: signature,
    };
  };
};

export default LeapCosmosExtensionProvider;
