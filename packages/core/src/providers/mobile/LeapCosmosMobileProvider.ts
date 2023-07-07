import type { Network } from "../../internals/network";
import CosmosWalletConnect from "../../internals/adapters/mobile/CosmosWalletConnect";
import WalletMobileProvider from "./WalletMobileProvider";

export const LeapCosmosMobileProvider = class LeapCosmosMobileProvider extends WalletMobileProvider {
  constructor({ networks, walletConnectProjectId }: { networks: Network[]; walletConnectProjectId?: string }) {
    super({
      id: "mobile-leap-cosmos",
      name: "Leap Cosmos - WalletConnect",
      networks,
      mobileProviderAdapter: new CosmosWalletConnect({
        walletConnectPeerName: "Leap Cosmos Wallet",
        walletConnectProjectId,
      }),
    });
  }

  generateIntents(uri?: string): { qrCodeUrl: string; iosUrl: string; androidUrl: string } {
    return {
      qrCodeUrl: uri || "",
      iosUrl: `leapcosmos://wcV2?${uri}`,
      androidUrl: `intent://wcV2?${uri}#Intent;package=io.leapwallet.cosmos;scheme=leapwallet;end;`,
    };
  }
};

export const MobileLeapCosmosProvider = LeapCosmosMobileProvider;

export default LeapCosmosMobileProvider;
