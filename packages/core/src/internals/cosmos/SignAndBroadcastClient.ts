import { OfflineDirectSigner, OfflineSigner } from "@cosmjs/proto-signing";
import { GasPrice, SigningStargateClient } from "@cosmjs/stargate";

import { createDefaultRegistry, type BroadcastResult } from "../../internals/transactions";
import type { TransactionMsg } from "../../internals/transactions/messages";
import { DEFAULT_CURRENCY, DEFAULT_GAS_PRICE, type Network } from "../../internals/network";
import type { WalletConnection } from "../../internals/wallet";
import type { Fee } from "../../internals/cosmos";

export class SignAndBroadcastClient {
  static async execute(
    offlineSigner: OfflineSigner & OfflineDirectSigner,
    {
      network,
      wallet,
      messages,
      feeAmount,
      gasLimit,
      memo,
      overrides,
    }: {
      network: Network;
      wallet: WalletConnection;
      messages: TransactionMsg[];
      feeAmount?: string | null;
      gasLimit?: string | null;
      memo?: string | null;
      overrides?: {
        rpc?: string;
        rest?: string;
      };
    },
  ): Promise<BroadcastResult> {
    const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
    const client = await SigningStargateClient.connectWithSigner(overrides?.rpc || network.rpc, offlineSigner, {
      gasPrice,
      registry: createDefaultRegistry(),
    });

    const processedMessages = messages.map((message) => message.toCosmosMsg());

    let fee: "auto" | Fee = "auto";
    if (feeAmount && feeAmount != "auto") {
      const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
      const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
      fee = {
        amount: [{ amount: feeAmount || gas, denom: feeCurrency.coinMinimalDenom }],
        gas: gasLimit || gas,
      };
    }

    const broadcast = await client.signAndBroadcast(wallet.account.address, processedMessages, fee, memo || "");

    return {
      hash: broadcast.transactionHash,
      rawLogs: broadcast.rawLog || "",
      response: broadcast,
    };
  }
}

export default SignAndBroadcastClient;
