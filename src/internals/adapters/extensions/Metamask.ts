import { getEthereumAddress, hexToBase64, hexToBuff, recoverTypedSignaturePubKey } from "@injectivelabs/sdk-ts";

import type { Network } from "../../../internals/network";
import type { SigningResult, BroadcastResult } from "../../../internals/transactions";
import type { TransactionMsg } from "../../../internals/transactions/messages";
import type { WalletConnection } from "../../../internals/wallet";
import type { WalletExtensionProvider } from "../../../providers";
import { isInjectiveNetwork } from "../../../internals/injective";
import InjectiveEIP712SigningClient from "../../../internals/cosmos/InjectiveEIP712SigningClient";
import EthArbitrarySigningClient from "../../evm/EthArbitrarySigningClient";
import { BroadcastClient } from "../../../internals/cosmos";
import { ExtensionProviderAdapter } from "./";

export type EthereumWindow = {
  isMetaMask?: boolean;
  request: (request: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

export class Metamask implements ExtensionProviderAdapter {
  isAvailable: boolean = false;
  ethereum?: EthereumWindow;
  extensionResolver: () => EthereumWindow | undefined;
  setupOnUpdateEventListener: (callback?: () => void) => void;

  constructor({
    extensionResolver,
    setupOnUpdateEventListener,
  }: {
    extensionResolver: () => EthereumWindow | undefined;
    setupOnUpdateEventListener: (callback?: () => void) => void;
  }) {
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

    if (!network.evm) {
      throw new Error(`Network with chainId "${network.chainId}" is not an EVM compatible network`);
    }

    const accounts = (await this.ethereum.request({
      method: "eth_requestAccounts",
    })) as string[];

    const address = network.evm.deriveCosmosAddress(accounts[0]);

    return {
      id: `provider:${provider.id}:network:${network.chainId}:address:${address}`,
      providerId: provider.id,
      account: {
        address: address,
        pubkey: null,
        algo: null,
      },
      network,
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
      feeAmount,
      gasLimit,
      memo,
      overrides,
    }: {
      network: Network;
      messages: TransactionMsg<any>[];
      wallet: WalletConnection;
      feeAmount?: string | null | undefined;
      gasLimit?: string | null | undefined;
      memo?: string | null | undefined;
      overrides?: { rpc?: string | undefined; rest?: string | undefined } | undefined;
    },
  ): Promise<SigningResult> {
    if (!this.ethereum) {
      throw new Error("Metamask is not available");
    }

    if (!network.evm) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" is not an EVM compatible network`);
    }

    if (!isInjectiveNetwork(network.chainId)) {
      throw new Error("Shuttle only supports Injective network with Metamask");
    }

    const {
      messages: preparedMessages,
      eip712TypedData,
      signDoc,
    } = await InjectiveEIP712SigningClient.prepare({
      network,
      wallet,
      messages,
      feeAmount,
      gasLimit,
      memo,
      overrides,
    });

    const signature = (await this.ethereum.request({
      method: "eth_signTypedData_v4",
      params: [getEthereumAddress(wallet.account.address), JSON.stringify(eip712TypedData)],
    })) as string;

    return await InjectiveEIP712SigningClient.finish({
      network,
      pubKey: hexToBase64(recoverTypedSignaturePubKey(eip712TypedData, signature)),
      messages: preparedMessages,
      signDoc,
      signature: hexToBuff(signature),
    });
  }

  async signAndBroadcast(
    provider: WalletExtensionProvider,
    {
      network,
      messages,
      wallet,
      feeAmount,
      gasLimit,
      memo,
      overrides,
    }: {
      network: Network;
      messages: TransactionMsg<any>[];
      wallet: WalletConnection;
      feeAmount?: string | null | undefined;
      gasLimit?: string | null | undefined;
      memo?: string | null | undefined;
      overrides?: { rpc?: string | undefined; rest?: string | undefined } | undefined;
    },
  ): Promise<BroadcastResult> {
    if (!this.ethereum) {
      throw new Error("Metamask is not available");
    }

    if (!network.evm) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" is not an EVM compatible network`);
    }

    if (!isInjectiveNetwork(network.chainId)) {
      throw new Error("Shuttle only supports Injective network with Metamask");
    }

    const signResult = await this.sign(provider, {
      network,
      messages,
      wallet,
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

    if (!network.evm) {
      throw new Error(`Network with chainId "${network.chainId}" is not an EVM compatible network`);
    }

    if (!isInjectiveNetwork(network.chainId)) {
      throw new Error("Shuttle only supports Injective network with Metamask");
    }

    const msg = EthArbitrarySigningClient.prepare(data);

    const signature = (await this.ethereum.request({
      method: "personal_sign",
      params: [msg, getEthereumAddress(wallet.account.address)],
    })) as string;

    return {
      signatures: [hexToBuff(signature)],
      response: signature,
    };
  }

  async verifyArbitrarySignature(
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

    if (!network.evm) {
      throw new Error(`Network with chainId "${network.chainId}" is not an EVM compatible network`);
    }

    if (!isInjectiveNetwork(network.chainId)) {
      throw new Error("Shuttle only supports Injective network with Metamask");
    }

    return EthArbitrarySigningClient.verify({
      wallet,
      data,
      signature: signResult.signatures[0],
    });
  }
}

export default Metamask;
