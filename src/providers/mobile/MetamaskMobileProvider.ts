import type { Network } from "../../internals/network";
import EvmWalletConnect from "../../internals/adapters/mobile/EvmWalletConnect";
import WalletMobileProvider from "./WalletMobileProvider";

export const MetamaskMobileProvider = class MetamaskMobileProvider extends WalletMobileProvider {
  constructor({ networks, walletConnectProjectId }: { networks: Network[]; walletConnectProjectId?: string }) {
    super({
      id: "mobile-metamask",
      name: "Metamask - WalletConnect",
      networks,
      mobileProviderAdapter: new EvmWalletConnect({
        walletConnectPeerName: "MetaMask Wallet",
        walletConnectProjectId,
      }),
    });
  }

  generateIntents(uri?: string): { qrCodeUrl: string; iosUrl: string; androidUrl: string } {
    return {
      qrCodeUrl: uri || "",
      iosUrl: `metamask://wc?uri=${encodeURIComponent(uri || "")}`,
      androidUrl: `metamask://wc?uri=${encodeURIComponent(uri || "")}`,
    };
  }
};

export const MobileMetamaskProvider = MetamaskMobileProvider;

export default MetamaskMobileProvider;
