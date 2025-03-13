import { OfflineDirectSigner, OfflineSigner } from "@cosmjs/proto-signing";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { GasPrice } from "@cosmjs/stargate";

import { type BroadcastResult } from "../../internals/transactions";
import type { TransactionMsg } from "../../internals/transactions/messages";
import { DEFAULT_CURRENCY, DEFAULT_GAS_PRICE, NetworkCurrency, type Network } from "../../internals/network";
import type { WalletConnection } from "../../internals/wallet";
import type { Fee } from "../../internals/cosmos";
import { extendedRegistryTypes } from "../registry";

export class SignAndBroadcastClient {
  static async execute(
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
  ): Promise<BroadcastResult> {
    const gasPrice = GasPrice.fromString(overrides?.gasPrice ?? network.gasPrice ?? DEFAULT_GAS_PRICE);
    const client = await SigningCosmWasmClient.connectWithSigner(overrides?.rpc || network.rpc, offlineSigner, {
      gasPrice,
    });
    for (const [typeUrl, type] of extendedRegistryTypes) {
      client.registry.register(typeUrl, type);
    }

    const processedMessages = messages.map((message) => message.toCosmosMsg());

    let computedFee: "auto" | Fee = fee ?? "auto";
    if (!fee && feeAmount && feeAmount != "auto") {
      const feeCurrency =
        overrides?.feeCurrency ?? network.feeCurrencies?.[0] ?? network.defaultCurrency ?? DEFAULT_CURRENCY;
      const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
      computedFee = {
        amount: [{ amount: feeAmount || gas, denom: feeCurrency.coinMinimalDenom }],
        gas: gasLimit || gas,
      };
    }

    const broadcast = await client.signAndBroadcast(wallet.account.address, processedMessages, computedFee, memo ?? "");

    return {
      hash: broadcast.transactionHash,
      rawLogs: broadcast.rawLog || "",
      events: broadcast.events,
      response: broadcast,
    };
  }
}

export default SignAndBroadcastClient;
