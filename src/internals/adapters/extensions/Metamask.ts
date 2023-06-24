import { getEthereumAddress, hexToBase64, hexToBuff, recoverTypedSignaturePubKey } from "@injectivelabs/sdk-ts";

import type { Network } from "../../../internals/network";
import type { SigningResult, BroadcastResult } from "../../../internals/transactions";
import type { TransactionMsg } from "../../../internals/transactions/messages";
import type { WalletConnection } from "../../../internals/wallet";
import type { WalletExtensionProvider } from "../../../providers";
import { isInjectiveNetwork } from "../../../internals/injective";
import InjectiveEIP712SigningClient from "../../../internals/cosmos/InjectiveEIP712SigningClient";
import { BroadcastClient } from "../../../internals/cosmos";
import { ExtensionProviderAdapter } from "./";

// export const recoverTypedSignaturePubKey = (data: any, signature: string): string => {
//   const compressedPubKeyPrefix = Buffer.from("04", "hex");
//   const message = TypedDataUtils.eip712Hash(data, SignTypedDataVersion.V4);
//   const sigParams = fromRpcSig(signature);
//   const publicKey = ecrecover(message, sigParams.v, sigParams.r, sigParams.s);
//   const prefixedKey = Buffer.concat([compressedPubKeyPrefix, publicKey]);
//   const compressedKey = Buffer.from(publicKeyConvert(prefixedKey));

//   return `0x${compressedKey.toString("hex")}`;
// };

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
}

export default Metamask;
