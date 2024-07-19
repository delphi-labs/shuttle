import CosmosWalletConnect from "../../internals/adapters/mobile/CosmosWalletConnect";
import type { Network } from "../../internals/network";
import WalletMobileProvider from "./WalletMobileProvider";

export const OnseiMobileProvider = class OnseiMobileProvider extends WalletMobileProvider {
  constructor({ networks, walletConnectProjectId }: { networks: Network[]; walletConnectProjectId?: string }) {
    super({
      id: "mobile-onsei-wallet",
      name: "onsei wallet - WalletConnect",
      networks,
      mobileProviderAdapter: new CosmosWalletConnect({
        walletConnectPeerName: "onsei wallet",
        walletConnectProjectId,
      }),
    });
  }

  generateIntents(uri?: string): { qrCodeUrl: string; iosUrl: string; androidUrl: string } {
    return {
      qrCodeUrl: uri || "",
      iosUrl: `onseiwallet://wcV2?${uri}`,
      androidUrl: `intent://wcV2?${uri}#Intent;package=com.ulamlabs.seiwallet;scheme=onseiwallet;end;`,
    };
  }
};

export default OnseiMobileProvider;
