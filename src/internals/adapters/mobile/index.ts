import type { Network } from "../../../internals/network";
import type { WalletConnection, WalletMobileSession } from "../../../internals/wallet";
import type { SigningResult } from "../../../internals/transactions";
import type { TransactionMsg } from "../../../internals/transactions/messages";
import type WalletMobileProvider from "../../../providers/mobile/WalletMobileProvider";

export interface MobileProviderAdapter {
  init(provider: WalletMobileProvider, params: { walletConnectProjectId?: string }): Promise<void>;
  isReady(): boolean;
  isSessionExpired(mobileSession: WalletMobileSession): boolean;
  getWalletConnection(
    provider: WalletMobileProvider,
    options: { network: Network; mobileSession: WalletMobileSession },
  ): Promise<WalletConnection>;
  connect(
    provider: WalletMobileProvider,
    options: { network: Network; callback?: ((wallet: WalletConnection) => void) | undefined },
  ): Promise<string>;
  disconnect(provider: WalletMobileProvider, options: { network: Network; wallet: WalletConnection }): Promise<void>;
  sign(
    provider: WalletMobileProvider,
    options: {
      network: Network;
      messages: TransactionMsg[];
      wallet: WalletConnection;
      feeAmount?: string | null;
      gasLimit?: string | null;
      memo?: string | null;
      overrides?: {
        rpc?: string;
        rest?: string;
      };
      intents: { androidUrl: string; iosUrl: string };
    },
  ): Promise<SigningResult>;
  signArbitrary(
    provider: WalletMobileProvider,
    options: {
      network: Network;
      wallet: WalletConnection;
      data: Uint8Array;
      intents: { androidUrl: string; iosUrl: string };
    },
  ): Promise<SigningResult>;
  verifyArbitrary(
    provider: WalletMobileProvider,
    options: {
      network: Network;
      wallet: WalletConnection;
      data: Uint8Array;
      signResult: SigningResult;
    },
  ): Promise<boolean>;
}

export * from "./wallet-connect";
export * from "./CosmosWalletConnect";
export * from "./EvmWalletConnect";
