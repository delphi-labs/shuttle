import type { Network } from "../../internals/network";
import { CosmosWalletConnect } from "../../internals/adapters/mobile/CosmosWalletConnect";
import WalletMobileProvider from "./WalletMobileProvider";

export const CosmostationMobileProvider = class CosmostationMobileProvider extends WalletMobileProvider {
  constructor({ networks, walletConnectProjectId }: { networks: Network[]; walletConnectProjectId?: string }) {
    super({
      id: "mobile-cosmostation",
      name: "Cosmostation - WalletConnect",
      networks,
      mobileProviderAdapter: new CosmosWalletConnect({
        walletConnectPeerName: "Cosmostation",
        walletConnectProjectId,
      }),
    });
  }

  generateIntents(uri?: string): { qrCodeUrl: string; iosUrl: string; androidUrl: string } {
    return {
      qrCodeUrl: uri || "",
      iosUrl: `cosmostation://wcV2?${uri}`,
      androidUrl: `intent://wcV2?${uri}#Intent;package=wannabit.io.cosmostaion;scheme=cosmostation;end;`,
    };
  }
};

export const MobileCosmostationProvider = CosmostationMobileProvider;

export default CosmostationMobileProvider;
