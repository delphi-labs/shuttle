import SignClient from "@walletconnect/sign-client";
import { SessionTypes } from "@walletconnect/types";
import { getEthereumAddress, hexToBase64, hexToBuff, recoverTypedSignaturePubKey } from "@injectivelabs/sdk-ts";

import { isAndroid, isIOS, isMobile } from "../../../utils/device";
import type { Network } from "../../../internals/network";
import type { WalletConnection } from "../../../internals/wallet";
import { fromInjectiveCosmosChainToEthereumChain, isInjectiveNetwork } from "../../../internals/injective";
import type { SigningResult } from "../../../internals/transactions";
import type { TransactionMsg } from "../../../internals/transactions/messages";
import InjectiveEIP712SigningClient from "../../../internals/cosmos/InjectiveEIP712SigningClient";
import type { WalletMobileProvider } from "../../../providers/mobile";
import EthArbitrarySigningClient from "../../evm/EthArbitrarySigningClient";
import { MobileProviderAdapter } from "./";

export class EvmWalletConnect implements MobileProviderAdapter {
  walletConnectPeerName: string;
  walletConnectProjectId?: string;
  walletConnect?: SignClient;
  walletConnectSession?: SessionTypes.Struct;
  accounts: {
    [chainId: string]: string[];
  };

  constructor({
    walletConnectPeerName,
    walletConnectProjectId,
  }: {
    walletConnectPeerName: string;
    walletConnectProjectId?: string;
  }) {
    this.walletConnectPeerName = walletConnectPeerName;
    this.walletConnectProjectId = walletConnectProjectId;
    this.accounts = {};
  }

  async init(provider: WalletMobileProvider, params: { walletConnectProjectId?: string }): Promise<void> {
    this.walletConnectProjectId = params.walletConnectProjectId ?? this.walletConnectProjectId;

    this.walletConnect = await SignClient.init({
      projectId: this.walletConnectProjectId,
    });

    const sessions = await this.walletConnect.session.getAll();
    this.walletConnectSession = sessions.find((session) => session.peer.metadata.name === this.walletConnectPeerName);

    this.walletConnect.on("session_update", () => {
      this.accounts = {};
      provider.onUpdate?.();
    });

    this.walletConnect.on("session_delete", async (session) => {
      if (this.walletConnectSession?.topic === session.topic) {
        await this.disconnect(provider);
      }
      this.accounts = {};
      provider.onUpdate?.();
    });
  }

  isReady(): boolean {
    return !!this.walletConnect;
  }

  isConnected(): boolean {
    return !!this.walletConnectSession;
  }

  private async getAccounts({ network }: { network: Network }): Promise<string[]> {
    if (!this.walletConnect || !this.walletConnectSession) {
      throw new Error("Wallet Connect is not available");
    }

    if (this.accounts[network.chainId]) {
      return this.accounts[network.chainId];
    }

    const chainPrefix = `eip155:${fromInjectiveCosmosChainToEthereumChain(network.chainId)}:`;

    return this.walletConnectSession.namespaces.eip155.accounts
      .filter((account) => account.includes(chainPrefix))
      .map((account) => account.replace(chainPrefix, ""));
  }

  async getWalletConnection(
    provider: WalletMobileProvider,
    { network }: { network: Network },
  ): Promise<WalletConnection> {
    if (!this.walletConnect || !this.walletConnectSession) {
      throw new Error("Wallet Connect is not available");
    }

    if (!network.evm) {
      throw new Error(`Network with chainId "${network.chainId}" is not an EVM compatible network`);
    }

    this.accounts[network.chainId] = await this.getAccounts({ network });

    if (!this.accounts[network.chainId] || this.accounts[network.chainId].length === 0) {
      throw new Error(`No wallet connected to chain: ${network.chainId}`);
    }

    const address = this.accounts[network.chainId][0];
    const bech32Address = network.evm.deriveCosmosAddress(address);

    return {
      id: `provider:${provider.id}:network:${network.chainId}:address:${bech32Address}`,
      providerId: provider.id,
      account: {
        address: bech32Address,
        pubkey: null,
        algo: null,
      },
      network,
    };
  }

  async connect(
    provider: WalletMobileProvider,
    {
      network,
      callback,
    }: {
      network: Network;
      callback?: ((walletConnection: WalletConnection) => void) | undefined;
    },
  ): Promise<string> {
    if (!this.walletConnect) {
      throw new Error("Wallet Connect is not available");
    }

    if (!network.evm) {
      throw new Error(`Network with chainId "${network.chainId}" is not an EVM compatible network`);
    }

    const { uri, approval } = await this.walletConnect.connect({
      requiredNamespaces: {
        eip155: {
          methods: [
            "eth_sendTransaction",
            "eth_signTransaction",
            "eth_sign",
            "personal_sign",
            "eth_signTypedData",
            "eth_signTypedData_v4",
            "eth_requestAccounts",
          ],
          chains: [`eip155:${fromInjectiveCosmosChainToEthereumChain(network.chainId)}`],
          events: ["chainChanged", "accountsChanged"],
        },
      },
    });

    approval().then(async (session) => {
      this.walletConnectSession = session;

      const peerMetaName = session.peer.metadata.name;
      if (peerMetaName !== this.walletConnectPeerName) {
        throw new Error(
          `Invalid provider, peerMetaName: ${peerMetaName} doesn't match the expected peerMetaName: ${this.walletConnectPeerName}`,
        );
      }

      const walletConnection = await this.getWalletConnection(provider, {
        network,
      });

      callback?.(walletConnection);
    });

    return uri || "";
  }

  async disconnect(_provider: WalletMobileProvider, _options?: { network: Network }): Promise<void> {
    if (this.walletConnect && this.walletConnectSession) {
      try {
        await this.walletConnect.disconnect({
          topic: this.walletConnectSession.topic,
          reason: {
            code: -1,
            message: "Disconnected by user",
          },
        });
      } catch {
        /* empty */
      }
      this.walletConnectSession = undefined;
      this.accounts = {};
    }
  }

  async sign(
    _provider: WalletMobileProvider,
    {
      network,
      messages,
      wallet,
      feeAmount,
      gasLimit,
      memo,
      overrides,
      intents,
    }: {
      network: Network;
      messages: TransactionMsg<any>[];
      wallet: WalletConnection;
      feeAmount?: string | null | undefined;
      gasLimit?: string | null | undefined;
      memo?: string | null | undefined;
      overrides?: { rpc?: string | undefined; rest?: string | undefined } | undefined;
      intents: { androidUrl: string; iosUrl: string };
    },
  ): Promise<SigningResult> {
    if (!this.walletConnect || !this.walletConnectSession) {
      throw new Error("Wallet Connect is not available");
    }

    if (!network.evm) {
      throw new Error(`Network with chainId "${network.chainId}" is not an EVM compatible network`);
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

    if (isMobile()) {
      if (isIOS()) {
        window.location.href = intents.iosUrl;
      } else if (isAndroid()) {
        window.location.href = intents.androidUrl;
      } else {
        window.location.href = intents.androidUrl;
      }
    }

    const signature = (await this.walletConnect.request({
      topic: this.walletConnectSession.topic,
      chainId: `eip155:${fromInjectiveCosmosChainToEthereumChain(network.chainId)}`,
      request: {
        method: "eth_signTypedData_v4",
        params: [getEthereumAddress(wallet.account.address), JSON.stringify(eip712TypedData)],
      },
    })) as string;

    return await InjectiveEIP712SigningClient.finish({
      network,
      pubKey: hexToBase64(recoverTypedSignaturePubKey(eip712TypedData, signature)),
      messages: preparedMessages,
      signDoc,
      signature: hexToBuff(signature),
    });
  }

  async signArbitrary(
    _provider: WalletMobileProvider,
    {
      network,
      wallet,
      data,
      intents,
    }: {
      network: Network;
      wallet: WalletConnection;
      data: Uint8Array;
      intents: { androidUrl: string; iosUrl: string };
    },
  ): Promise<SigningResult> {
    if (!this.walletConnect || !this.walletConnectSession) {
      throw new Error("Wallet Connect is not available");
    }

    if (!network.evm) {
      throw new Error(`Network with chainId "${network.chainId}" is not an EVM compatible network`);
    }

    if (!isInjectiveNetwork(network.chainId)) {
      throw new Error("Shuttle only supports Injective network with Metamask");
    }

    if (isMobile()) {
      if (isIOS()) {
        window.location.href = intents.iosUrl;
      } else if (isAndroid()) {
        window.location.href = intents.androidUrl;
      } else {
        window.location.href = intents.androidUrl;
      }
    }

    const msg = EthArbitrarySigningClient.prepare(data);

    const signature = (await this.walletConnect.request({
      topic: this.walletConnectSession.topic,
      chainId: `eip155:${fromInjectiveCosmosChainToEthereumChain(network.chainId)}`,
      request: {
        method: "personal_sign",
        params: [getEthereumAddress(wallet.account.address), msg],
      },
    })) as string;

    return {
      signatures: [hexToBuff(signature)],
      response: signature,
    };
  }

  async verifyArbitrary(
    _provider: WalletMobileProvider,
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
    if (!this.walletConnect || !this.walletConnectSession) {
      throw new Error("Wallet Connect is not available");
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

export default EvmWalletConnect;
