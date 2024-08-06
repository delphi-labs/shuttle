import { AminoSignResponse } from "@cosmjs/amino";
import SignClient from "@walletconnect/sign-client";

import { isAndroid, isIOS, isMobile } from "../../../utils/device";
import type { Network, NetworkCurrency } from "../../../internals/network";
import { type WalletConnection, type Algo, Algos, WalletMobileSession } from "../../../internals/wallet";
import type { WalletMobileProvider } from "../../../providers/mobile";
import type { SigningResult } from "../../../internals/transactions";
import type { TransactionMsg } from "../../../internals/transactions/messages";
import AminoSigningClient from "../../../internals/cosmos/AminoSigningClient";
import ArbitrarySigningClient from "../../cosmos/ArbitrarySigningClient";
import { MobileProviderAdapter, setupWalletConnect } from "./";

type CosmosWCAccount = {
  address: string;
  algo: string;
  pubkey: string;
};

export class CosmosWalletConnect implements MobileProviderAdapter {
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
  }): Promise<CosmosWCAccount[] | null> {
    if (!this.walletConnect) {
      throw new Error("Wallet Connect is not available");
    }

    if (!mobileSession.walletConnectSession || this.isSessionExpired(mobileSession)) {
      throw new Error("Wallet Connect session is not available");
    }

    return await this.walletConnect.request({
      topic: mobileSession.walletConnectSession?.topic,
      chainId: `cosmos:${network.chainId}`,
      request: {
        method: "cosmos_getAccounts",
        params: {},
      },
    });
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

    const accounts = await this.getAccounts({ network, mobileSession });

    if (!accounts || accounts.length === 0) {
      throw new Error(`No wallet connected to chain: ${network.chainId}`);
    }

    return {
      id: `provider:${provider.id}:network:${network.chainId}:address:${accounts[0].address}`,
      providerId: provider.id,
      account: {
        address: accounts[0].address,
        pubkey: accounts[0].pubkey,
        algo: accounts[0].algo as Algo,
      },
      network,
      mobileSession: mobileSession,
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
        await this.walletConnect.disconnect({
          topic: wallet.mobileSession.walletConnectSession.topic,
          reason: {
            code: -1,
            message: "Disconnected by user",
          },
        });
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
      intents: { androidUrl: string; iosUrl: string };
    },
  ): Promise<SigningResult> {
    if (!this.walletConnect) {
      throw new Error("Wallet Connect is not available");
    }

    if (!wallet.mobileSession.walletConnectSession || this.isSessionExpired(wallet.mobileSession)) {
      throw new Error("Wallet Connect session is not available");
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
      topic: wallet.mobileSession.walletConnectSession.topic,
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
    if (!this.walletConnect) {
      throw new Error("Wallet Connect is not available");
    }

    if (!wallet.mobileSession.walletConnectSession || this.isSessionExpired(wallet.mobileSession)) {
      throw new Error("Wallet Connect session is not available");
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
      topic: wallet.mobileSession.walletConnectSession.topic,
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
