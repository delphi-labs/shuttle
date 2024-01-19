import type { Network } from "../../internals/network";
import CosmosWalletConnect from "../../internals/adapters/mobile/CosmosWalletConnect";
import WalletMobileProvider from "./WalletMobileProvider";

export const BitgetMobileProvider = class BitgetMobileProvider extends WalletMobileProvider {
  constructor({ networks, walletConnectProjectId }: { networks: Network[]; walletConnectProjectId?: string }) {
    super({
      id: "mobile-bitget",
      name: "Bitget - WalletConnect",
      networks,
      mobileProviderAdapter: new CosmosWalletConnect({
        walletConnectPeerName: "Bitget",
        walletConnectProjectId,
      }),
    });
  }

  generateIntents(uri?: string): { qrCodeUrl: string; iosUrl: string; androidUrl: string } {
    return {
      qrCodeUrl: uri || "",
      iosUrl: `bitkeep://bkconnect?${uri}`,
      androidUrl: `https://bkcode.vip?${uri}`,
    };
  }
};

export default BitgetMobileProvider;
