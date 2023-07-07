import type { Network } from "../../internals/network";
import CosmosWalletConnect from "../../internals/adapters/mobile/CosmosWalletConnect";
import WalletMobileProvider from "./WalletMobileProvider";

export const KeplrMobileProvider = class KeplrMobileProvider extends WalletMobileProvider {
  constructor({ networks, walletConnectProjectId }: { networks: Network[]; walletConnectProjectId?: string }) {
    super({
      id: "mobile-keplr",
      name: "Keplr - WalletConnect",
      networks,
      mobileProviderAdapter: new CosmosWalletConnect({
        walletConnectPeerName: "Keplr",
        walletConnectProjectId,
      }),
    });
  }

  generateIntents(uri?: string): { qrCodeUrl: string; iosUrl: string; androidUrl: string } {
    return {
      qrCodeUrl: uri || "",
      iosUrl: `keplrwallet://wcV2?${uri}`,
      androidUrl: `intent://wcV2?${uri}#Intent;package=com.chainapsis.keplr;scheme=keplrwallet;end;`,
    };
  }
};

export const MobileKeplrProvider = KeplrMobileProvider;

export default KeplrMobileProvider;
