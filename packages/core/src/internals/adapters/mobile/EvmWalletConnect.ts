import SignClient from "@walletconnect/sign-client";
import { getEthereumAddress, hexToBase64, hexToBuff, recoverTypedSignaturePubKey } from "@injectivelabs/sdk-ts";

import { isAndroid, isIOS, isMobile } from "../../../utils/device";
import type { Network } from "../../../internals/network";
import type { WalletConnection, WalletMobileSession } from "../../../internals/wallet";
import { fromInjectiveCosmosChainToEthereumChain, isInjectiveNetwork } from "../../../internals/injective";
import type { SigningResult } from "../../../internals/transactions";
import type { TransactionMsg } from "../../../internals/transactions/messages";
import InjectiveEIP712SigningClient from "../../../internals/cosmos/InjectiveEIP712SigningClient";
import type { WalletMobileProvider } from "../../../providers/mobile";
import EthArbitrarySigningClient from "../../evm/EthArbitrarySigningClient";
import { MobileProviderAdapter, setupWalletConnect } from "./";

export class EvmWalletConnect implements MobileProviderAdapter {
  walletConnectPeerName: string;
  walletConnectProjectId?: string;
  walletConnect?: SignClient;

  constructor({
    walletConnectPeerName,
    walletConnectProjectId,
  }: {
    walletConnectPeerName: string;
    walletConnectProjectId?: string;
  }) {
    this.walletConnectPeerName = walletConnectPeerName;
    this.walletConnectProjectId = walletConnectProjectId;
  }

  async init(provider: WalletMobileProvider, params: { walletConnectProjectId?: string }): Promise<void> {
    this.walletConnectProjectId = params.walletConnectProjectId ?? this.walletConnectProjectId;

    this.walletConnect = await setupWalletConnect(this.walletConnectProjectId || "");

    this.walletConnect.on("session_update", () => {
      provider.onUpdate?.();
    });

    this.walletConnect.on("session_delete", () => {
      provider.onUpdate?.();
    });
  }

  isReady(): boolean {
    return !!this.walletConnect;
  }

  isSessionExpired(mobileSession: WalletMobileSession): boolean {
    if (!mobileSession.walletConnectSession) {
      return true;
    }

    return mobileSession.walletConnectSession.expiry < Date.now() / 1000;
  }

  private async getAccounts({
    network,
    mobileSession,
  }: {
    network: Network;
    mobileSession: WalletMobileSession;
  }): Promise<string[]> {
    if (!this.walletConnect) {
      throw new Error("Wallet Connect is not available");
    }

    if (!mobileSession.walletConnectSession || this.isSessionExpired(mobileSession)) {
      throw new Error("Wallet Connect session is not available");
    }

    const chainPrefix = `eip155:${fromInjectiveCosmosChainToEthereumChain(network.chainId)}:`;

    const currentSession = this.walletConnect.session.get(mobileSession.walletConnectSession.topic);

    return currentSession.namespaces["eip155"].accounts
      .filter((account) => account.includes(chainPrefix))
      .map((account) => account.replace(chainPrefix, ""));
  }

  async getWalletConnection(
    provider: WalletMobileProvider,
    { network, mobileSession }: { network: Network; mobileSession: WalletMobileSession },
  ): Promise<WalletConnection> {
    if (!this.walletConnect) {
      throw new Error("Wallet Connect is not available");
    }

    if (!mobileSession.walletConnectSession || this.isSessionExpired(mobileSession)) {
      throw new Error("Wallet Connect session is not available");
    }

    if (!network.evm) {
      throw new Error(`Network with chainId "${network.chainId}" is not an EVM compatible network`);
    }

    const accounts = await this.getAccounts({ network, mobileSession });

    if (!accounts || accounts.length === 0) {
      throw new Error(`No wallet connected to chain: ${network.chainId}`);
    }

    const address = accounts[0];
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
      mobileSession: mobileSession,
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
      const peerMetaName = session.peer.metadata.name;
      if (peerMetaName !== this.walletConnectPeerName) {
        throw new Error(
          `Invalid provider, peerMetaName: ${peerMetaName} doesn't match the expected peerMetaName: ${this.walletConnectPeerName}`,
        );
      }

      const walletConnection = await this.getWalletConnection(provider, {
        network,
        mobileSession: {
          walletConnectSession: {
            topic: session.topic,
            expiry: session.expiry,
          },
        },
      });

      callback?.(walletConnection);
    });

    return uri || "";
  }

  async disconnect(
    _provider: WalletMobileProvider,
    { wallet }: { network: Network; wallet: WalletConnection },
  ): Promise<void> {
    if (this.walletConnect && wallet.mobileSession.walletConnectSession) {
      try {
        const session = this.walletConnect.session.get(wallet.mobileSession.walletConnectSession.topic);
        if (session) {
          await this.walletConnect.disconnect({
            topic: wallet.mobileSession.walletConnectSession.topic,
            reason: {
              code: -1,
              message: "Disconnected by user",
            },
          });
        }
      } catch {
        /* empty */
      }
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
      overrides?: { rpc?: string | undefined; rest?: string | undefined; gasAdjustment?: number } | undefined;
      intents: { androidUrl: string; iosUrl: string };
    },
  ): Promise<SigningResult> {
    if (!this.walletConnect) {
      throw new Error("Wallet Connect is not available");
    }

    if (!wallet.mobileSession.walletConnectSession || this.isSessionExpired(wallet.mobileSession)) {
      throw new Error("Wallet Connect session is not available");
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
      topic: wallet.mobileSession.walletConnectSession.topic,
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
    if (!this.walletConnect) {
      throw new Error("Wallet Connect is not available");
    }

    if (!wallet.mobileSession.walletConnectSession || this.isSessionExpired(wallet.mobileSession)) {
      throw new Error("Wallet Connect session is not available");
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
      topic: wallet.mobileSession.walletConnectSession.topic,
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
