import { AminoSignResponse, StdSignature } from "@cosmjs/amino";

import { isAndroid, isIOS, isMobile } from "../../../utils/device";
import type { Network } from "../../../internals/network";
import { type WalletConnection } from "../../../internals/wallet";
import type { WalletMobileProvider } from "../../../providers/mobile";
import type { SigningResult } from "../../../internals/transactions";
import type { TransactionMsg } from "../../../internals/transactions/messages";
import AminoSigningClient from "../../../internals/cosmos/AminoSigningClient";
import { ArbitrarySigningClient } from "../../cosmos";
import { CosmosWalletConnect, MobileProviderAdapter } from "./";

export class CosmostationWalletConnect extends CosmosWalletConnect implements MobileProviderAdapter {
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
    if (!this.walletConnect || !wallet.mobileSession.walletConnectSession) {
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

    const signature = (await this.walletConnect.request({
      topic: wallet.mobileSession.walletConnectSession.topic,
      chainId: `cosmos:${network.chainId}`,
      request: {
        method: "cosmos_signAmino",
        params: {
          signerAddress: wallet.account.address,
          signDoc,
        },
      },
    })) as StdSignature;

    const signResponse: AminoSignResponse = {
      signed: signDoc,
      signature: signature,
    };

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
    if (!this.walletConnect || !wallet.mobileSession.walletConnectSession) {
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

    const signature = (await this.walletConnect.request({
      topic: wallet.mobileSession.walletConnectSession.topic,
      chainId: `cosmos:${network.chainId}`,
      request: {
        method: "cosmos_signAmino",
        params: {
          signerAddress: wallet.account.address,
          signDoc,
        },
      },
    })) as StdSignature;

    const signResponse: AminoSignResponse = {
      signed: signDoc,
      signature: signature,
    };

    return {
      signatures: [Buffer.from(signResponse.signature.signature, "base64")],
      response: signResponse,
    };
  }
}

export default CosmostationWalletConnect;
