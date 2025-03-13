import { GasPrice } from "@cosmjs/stargate";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { OfflineDirectSigner, OfflineSigner } from "@cosmjs/proto-signing";

import { type SigningResult } from "../../internals/transactions";
import type { TransactionMsg } from "../../internals/transactions/messages";
import type { WalletConnection } from "../../internals/wallet";
import type { Network, NetworkCurrency } from "../../internals/network";
import { DEFAULT_CURRENCY, DEFAULT_GAS_PRICE, isInjectiveNetwork } from "../../internals/network";
import { extendedRegistryTypes } from "../registry";
import InjectiveOfflineDirectSigningClient from "../injective/InjectiveOfflineDirectSigningClient";
import { Fee } from ".";

export class OfflineDirectSigningClient {
  static async sign(
    offlineSigner: OfflineSigner & OfflineDirectSigner,
    {
      network,
      wallet,
      messages,
      fee,
      feeAmount,
      gasLimit,
      memo,
      overrides,
    }: {
      network: Network;
      wallet: WalletConnection;
      messages: TransactionMsg[];
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
    if (isInjectiveNetwork(network.chainId)) {
      return await InjectiveOfflineDirectSigningClient.sign(offlineSigner, {
        network,
        wallet,
        messages,
        fee,
        feeAmount,
        gasLimit,
        memo,
        overrides,
      });
    }

    const gasPrice = GasPrice.fromString(overrides?.gasPrice ?? network.gasPrice ?? DEFAULT_GAS_PRICE);
    const client = await SigningCosmWasmClient.connectWithSigner(overrides?.rpc ?? network.rpc, offlineSigner, {
      gasPrice,
    });
    for (const [typeUrl, type] of extendedRegistryTypes) {
      client.registry.register(typeUrl, type);
    }

    const processedMessages = messages.map((message) => message.toCosmosMsg());

    const feeCurrency =
      overrides?.feeCurrency ?? network.feeCurrencies?.[0] ?? network.defaultCurrency ?? DEFAULT_CURRENCY;
    const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
    const computedFee = fee ?? {
      amount: [{ amount: feeAmount || gas, denom: feeCurrency.coinMinimalDenom }],
      gas: gasLimit || gas,
    };

    const txRaw = await client.sign(wallet.account.address, processedMessages, computedFee, memo ?? "");

    return {
      signatures: txRaw.signatures,
      response: txRaw,
    };
  }
}

export default OfflineDirectSigningClient;
