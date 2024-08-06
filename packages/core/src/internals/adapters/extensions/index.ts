import type { Network, NetworkCurrency } from "../../../internals/network";
import type { BroadcastResult, SigningResult } from "../../../internals/transactions";
import type { TransactionMsg } from "../../../internals/transactions/messages";
import type { WalletConnection } from "../../../internals/wallet";
import type WalletExtensionProvider from "../../../providers/extensions/WalletExtensionProvider";

export interface ExtensionProviderAdapter {
  init(provider: WalletExtensionProvider): Promise<void>;
  isReady(): boolean;
  connect(provider: WalletExtensionProvider, options: { network: Network }): Promise<WalletConnection>;
  disconnect(
    provider: WalletExtensionProvider,
    options?: { network: Network; wallet: WalletConnection },
  ): Promise<void>;
  sign(
    provider: WalletExtensionProvider,
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
        gasAdjustment?: number;
        gasPrice?: string;
        feeCurrency?: NetworkCurrency;
      };
    },
  ): Promise<SigningResult>;
  signAndBroadcast(
    provider: WalletExtensionProvider,
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
        gasAdjustment?: number;
        gasPrice?: string;
        feeCurrency?: NetworkCurrency;
      };
    },
  ): Promise<BroadcastResult>;
  signArbitrary(
    provider: WalletExtensionProvider,
    options: {
      network: Network;
      wallet: WalletConnection;
      data: Uint8Array;
    },
  ): Promise<SigningResult>;
  verifyArbitrary(
    provider: WalletExtensionProvider,
    options: {
      network: Network;
      wallet: WalletConnection;
      data: Uint8Array;
      signResult: SigningResult;
    },
  ): Promise<boolean>;
}

export * from "./Keplr";
