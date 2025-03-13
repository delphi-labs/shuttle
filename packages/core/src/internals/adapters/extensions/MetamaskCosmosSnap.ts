import { Algo, AminoSignResponse } from "@cosmjs/amino";
import { toBase64 } from "@cosmjs/encoding";

import type { Network, NetworkCurrency } from "../../network";
import type { SigningResult, BroadcastResult } from "../../transactions";
import type { TransactionMsg } from "../../transactions/messages";
import type { WalletConnection } from "../../wallet";
import type { WalletExtensionProvider } from "../../../providers";
import { AminoSigningClient, ArbitrarySigningClient, BroadcastClient, Fee } from "../../cosmos";
import { ExtensionProviderAdapter } from ".";
import { EthereumWindow } from "./Metamask";

interface SnapKey {
  algo: Algo;
  name: string;
  pubkey: Uint8Array;
  address: string;
  isNanoLedger: boolean;
}

const SUPPORTED_COIN_TYPES = [118];

export class MetamaskCosmosSnap implements ExtensionProviderAdapter {
  snapId: string;
  isAvailable: boolean = false;
  ethereum?: EthereumWindow;
  extensionResolver: () => EthereumWindow | undefined;
  setupOnUpdateEventListener: (callback?: () => void) => void;

  constructor({
    snapId,
    extensionResolver,
    setupOnUpdateEventListener,
  }: {
    snapId: string;
    extensionResolver: () => EthereumWindow | undefined;
    setupOnUpdateEventListener: (callback?: () => void) => void;
  }) {
    this.snapId = snapId;
    this.extensionResolver = extensionResolver;
    this.setupOnUpdateEventListener = setupOnUpdateEventListener;
  }

  async init(provider: WalletExtensionProvider): Promise<void> {
    this.ethereum = this.extensionResolver?.();

    if (!this.ethereum) {
      throw new Error("Metamask is not available");
    }

    this.setupOnUpdateEventListener?.(() => {
      provider.onUpdate?.();
    });

    this.isAvailable = true;
  }

  isReady(): boolean {
    return this.isAvailable;
  }

  async connect(provider: WalletExtensionProvider, { network }: { network: Network }): Promise<WalletConnection> {
    if (!this.ethereum) {
      throw new Error("Metamask is not available");
    }

    if (SUPPORTED_COIN_TYPES.includes(network.bip44?.coinType || 0)) {
      throw new Error(
        `Network with chainId "${network.chainId}" does not have a supported coin type (network coinType: ${network.bip44?.coinType}) for Metamask Snap with id "${this.snapId}"`,
      );
    }

    try {
      await this.ethereum.request({
        method: "wallet_requestSnaps",
        params: {
          [this.snapId]: {},
        },
      });
    } catch (error) {
      throw new Error(
        `Failed to install Metamask snap with id "${this.snapId}": ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }

    const account = (await this.ethereum.request({
      method: "wallet_invokeSnap",
      params: {
        snapId: this.snapId,
        request: {
          method: "getKey",
          params: {
            chainId: network.chainId,
          },
        },
      },
    })) as SnapKey;

    return {
      id: `provider:${provider.id}:network:${network.chainId}:address:${account.address}`,
      providerId: provider.id,
      account: {
        address: account.address,
        pubkey: toBase64(account.pubkey),
        algo: account.algo as Algo,
        isLedger: account.isNanoLedger,
      },
      network,
      mobileSession: {},
    };
  }

  async disconnect(_provider: WalletExtensionProvider, _options?: { network: Network } | undefined): Promise<void> {
    return;
  }

  async sign(
    _provider: WalletExtensionProvider,
    {
      network,
      messages,
      wallet,
      fee,
      feeAmount,
      gasLimit,
      memo,
      overrides,
    }: {
      network: Network;
      messages: TransactionMsg<any>[];
      wallet: WalletConnection;
      fee?: Fee | null;
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
  ): Promise<SigningResult> {
    if (!this.ethereum) {
      throw new Error("Metamask is not available");
    }

    if (SUPPORTED_COIN_TYPES.includes(network.bip44?.coinType || 0)) {
      throw new Error(
        `Network with chainId "${network.chainId}" does not have a supported coin type (network coinType: ${network.bip44?.coinType}) for Metamask Snap with id "${this.snapId}"`,
      );
    }

    const signDoc = await AminoSigningClient.prepare({
      network,
      wallet,
      messages,
      fee,
      feeAmount,
      gasLimit,
      memo,
      overrides,
    });

    const signResponse = (await this.ethereum.request({
      method: "wallet_invokeSnap",
      params: {
        snapId: this.snapId,
        request: {
          method: "signAmino",
          params: {
            chainId: network.chainId,
            signerAddress: wallet.account.address,
            signDoc,
          },
        },
      },
    })) as AminoSignResponse;

    return await AminoSigningClient.finish({
      network,
      messages,
      signResponse,
    });
  }

  async signAndBroadcast(
    provider: WalletExtensionProvider,
    {
      network,
      messages,
      wallet,
      fee,
      feeAmount,
      gasLimit,
      memo,
      overrides,
    }: {
      network: Network;
      messages: TransactionMsg<any>[];
      wallet: WalletConnection;
      fee?: Fee | null;
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
  ): Promise<BroadcastResult> {
    if (!this.ethereum) {
      throw new Error("Metamask is not available");
    }

    if (SUPPORTED_COIN_TYPES.includes(network.bip44?.coinType || 0)) {
      throw new Error(
        `Network with chainId "${network.chainId}" does not have a supported coin type (network coinType: ${network.bip44?.coinType}) for Metamask Snap with id "${this.snapId}"`,
      );
    }

    const signResult = await this.sign(provider, {
      network,
      messages,
      wallet,
      fee,
      feeAmount,
      gasLimit,
      memo,
      overrides,
    });

    return BroadcastClient.execute({
      network,
      signResult,
      overrides,
    });
  }

  async signArbitrary(
    _provider: WalletExtensionProvider,
    {
      network,
      wallet,
      data,
    }: {
      network: Network;
      wallet: WalletConnection;
      data: Uint8Array;
    },
  ): Promise<SigningResult> {
    if (!this.ethereum) {
      throw new Error("Metamask is not available");
    }

    if (SUPPORTED_COIN_TYPES.includes(network.bip44?.coinType || 0)) {
      throw new Error(
        `Network with chainId "${network.chainId}" does not have a supported coin type (network coinType: ${network.bip44?.coinType}) for Metamask Snap with id "${this.snapId}"`,
      );
    }

    const signDoc = ArbitrarySigningClient.prepareSigningWithMemo({ network, data });

    const signResponse = (await this.ethereum.request({
      method: "wallet_invokeSnap",
      params: {
        snapId: this.snapId,
        request: {
          method: "signAmino",
          params: {
            chainId: network.chainId,
            signerAddress: wallet.account.address,
            signDoc,
          },
        },
      },
    })) as AminoSignResponse;

    return {
      signatures: [Buffer.from(signResponse.signature.signature, "base64")],
      response: signResponse,
    };
  }

  async verifyArbitrary(
    _provider: WalletExtensionProvider,
    {
      network,
      wallet,
      data,
      signResult,
    }: {
      network: Network;
      wallet: WalletConnection;
      data: Uint8Array;
      signResult: SigningResult;
    },
  ): Promise<boolean> {
    if (!this.ethereum) {
      throw new Error("Metamask is not available");
    }

    if (SUPPORTED_COIN_TYPES.includes(network.bip44?.coinType || 0)) {
      throw new Error(
        `Network with chainId "${network.chainId}" does not have a supported coin type (network coinType: ${network.bip44?.coinType}) for Metamask Snap with id "${this.snapId}"`,
      );
    }

    return await ArbitrarySigningClient.verifyMemoSignature({
      network,
      wallet,
      data,
      signature: signResult.signatures[0],
    });
  }
}

export default MetamaskCosmosSnap;
