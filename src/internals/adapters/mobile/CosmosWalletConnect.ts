import { AminoSignResponse } from "@cosmjs/amino";
import SignClient from "@walletconnect/sign-client";
import { SessionTypes } from "@walletconnect/types";

import { isAndroid, isIOS, isMobile } from "../../../utils/device";
import type { Network } from "../../../internals/network";
import { type WalletConnection, type Algo, Algos } from "../../../internals/wallet";
import type { WalletMobileProvider } from "../../../providers/mobile";
import type { SigningResult } from "../../../internals/transactions";
import type { TransactionMsg } from "../../../internals/transactions/messages";
import AminoSigningClient from "../../../internals/cosmos/AminoSigningClient";
import ArbitrarySigningClient from "../../cosmos/ArbitrarySigningClient";
import { MobileProviderAdapter } from "./";

type CosmosWCAccount = {
  address: string;
  algo: string;
  pubkey: string;
};

export class CosmosWalletConnect implements MobileProviderAdapter {
  walletConnectPeerName: string;
  walletConnectProjectId?: string;
  walletConnect?: SignClient;
  walletConnectSession?: SessionTypes.Struct;
  accounts: {
    [chainId: string]: CosmosWCAccount[];
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

  private async getAccounts({ network }: { network: Network }): Promise<CosmosWCAccount[]> {
    if (!this.walletConnect || !this.walletConnectSession) {
      throw new Error("Wallet Connect is not available");
    }

    if (this.accounts[network.chainId]) {
      return this.accounts[network.chainId];
    }

    return await this.walletConnect.request({
      topic: this.walletConnectSession.topic,
      chainId: `cosmos:${network.chainId}`,
      request: {
        method: "cosmos_getAccounts",
        params: {},
      },
    });
  }

  async getWalletConnection(
    provider: WalletMobileProvider,
    { network }: { network: Network },
  ): Promise<WalletConnection> {
    if (!this.walletConnect || !this.walletConnectSession) {
      throw new Error("Wallet Connect is not available");
    }

    this.accounts[network.chainId] = await this.getAccounts({ network });

    if (!this.accounts[network.chainId] || this.accounts[network.chainId].length === 0) {
      throw new Error(`No wallet connected to chain: ${network.chainId}`);
    }

    const account = this.accounts[network.chainId][0];

    return {
      id: `provider:${provider.id}:network:${network.chainId}:address:${account.address}`,
      providerId: provider.id,
      account: {
        address: account.address,
        pubkey: account.pubkey,
        algo: account.algo as Algo,
      },
      network,
    };
  }

  async connect(
    provider: WalletMobileProvider,
    { network, callback }: { network: Network; callback?: ((walletConnection: WalletConnection) => void) | undefined },
  ): Promise<string> {
    if (!this.walletConnect) {
      throw new Error("Wallet Connect is not available");
    }

    const { uri, approval } = await this.walletConnect.connect({
      requiredNamespaces: {
        cosmos: {
          methods: ["cosmos_getAccounts", "cosmos_signAmino", "cosmos_signDirect"],
          chains: [`cosmos:${network.chainId}`],
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

      const walletConnection = await this.getWalletConnection(provider, { network });

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

    const signDoc = await AminoSigningClient.prepare({
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

    const signResponse = (await this.walletConnect.request({
      topic: this.walletConnectSession.topic,
      chainId: `cosmos:${network.chainId}`,
      request: {
        method: "cosmos_signAmino",
        params: {
          signerAddress: wallet.account.address,
          signDoc,
        },
      },
    })) as AminoSignResponse;

    return await AminoSigningClient.finish({
      network,
      messages,
      signResponse,
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

    const signDoc = ArbitrarySigningClient.prepareSigningWithMemo({ network, data });

    if (isMobile()) {
      if (isIOS()) {
        window.location.href = intents.iosUrl;
      } else if (isAndroid()) {
        window.location.href = intents.androidUrl;
      } else {
        window.location.href = intents.androidUrl;
      }
    }

    const signResponse = (await this.walletConnect.request({
      topic: this.walletConnectSession.topic,
      chainId: `cosmos:${network.chainId}`,
      request: {
        method: "cosmos_signAmino",
        params: {
          signerAddress: wallet.account.address,
          signDoc,
        },
      },
    })) as AminoSignResponse;

    return {
      signatures: [Buffer.from(signResponse.signature.signature, "base64")],
      response: signResponse,
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

    if (wallet.account.algo !== Algos.secp256k1) {
      throw new Error(`Unsupported algorithm: ${wallet.account.algo}`);
    }

    return await ArbitrarySigningClient.verifyMemoSignature({
      network,
      wallet,
      data,
      signature: signResult.signatures[0],
    });
  }
}

export default CosmosWalletConnect;
