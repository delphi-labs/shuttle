import { GasPrice } from "@cosmjs/stargate";
import { OfflineDirectSigner, OfflineSigner } from "@cosmjs/proto-signing";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import {
  BaseAccount,
  ChainRestAuthApi,
  createTransactionAndCosmosSignDoc,
  createTxRawFromSigResponse,
} from "@injectivelabs/sdk-ts";

import { type SigningResult } from "../../internals/transactions";
import type { TransactionMsg } from "../../internals/transactions/messages";
import type { WalletConnection } from "../../internals/wallet";
import type { Fee } from "../../internals/cosmos";
import type { Network } from "../../internals/network";
import { DEFAULT_CURRENCY, DEFAULT_GAS_PRICE } from "../../internals/network";
import { isInjectiveNetwork, prepareMessagesForInjective } from "../../internals/injective";
import { extendedRegistryTypes } from "../registry";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";

export class OfflineDirectSigningClient {
  static async sign(
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
        gasAdjustment?: number;
      };
    },
  ): Promise<SigningResult> {
    if (isInjectiveNetwork(network.chainId)) {
      return await this.injective(offlineSigner, {
        network,
        wallet,
        messages,
        feeAmount,
        gasLimit,
        memo,
        overrides,
      });
    }

    return await this.cosmos(offlineSigner, {
      network,
      wallet,
      messages,
      feeAmount,
      gasLimit,
      memo,
      overrides,
    });
  }

  static async injective(
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
        gasAdjustment?: number;
      };
    },
  ): Promise<SigningResult> {
    const chainRestAuthApi = new ChainRestAuthApi(overrides?.rest ?? network.rest);
    const accountDetailsResponse = await chainRestAuthApi.fetchAccount(wallet.account.address);
    const baseAccount = BaseAccount.fromRestApi(accountDetailsResponse);

    const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
    let fee: Fee | undefined = undefined;
    if (feeAmount && feeAmount != "auto") {
      const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
      const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
      fee = {
        amount: [{ amount: feeAmount || gas, denom: feeCurrency.coinMinimalDenom }],
        gas: gasLimit || gas,
      };
    }

    const preparedTx = createTransactionAndCosmosSignDoc({
      pubKey: wallet.account.pubkey || "",
      chainId: network.chainId,
      fee,
      message: prepareMessagesForInjective(messages),
      sequence: baseAccount.sequence,
      accountNumber: baseAccount.accountNumber,
      memo: memo || "",
    });

    const directSignResponse = await offlineSigner.signDirect(
      wallet.account.address,
      preparedTx.cosmosSignDoc as unknown as SignDoc,
    );
    const signing = createTxRawFromSigResponse(directSignResponse);

    return {
      signatures: signing.signatures,
      response: signing,
    };
  }

  static async cosmos(
    offlineSigner: OfflineDirectSigner,
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
        gasAdjustment?: number;
      };
    },
  ): Promise<SigningResult> {
    const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
    const client = await SigningCosmWasmClient.connectWithSigner(overrides?.rpc ?? network.rpc, offlineSigner, {
      gasPrice,
    });
    for (const [typeUrl, type] of extendedRegistryTypes) {
      client.registry.register(typeUrl, type);
    }

    const processedMessages = messages.map((message) => message.toCosmosMsg());

    const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
    const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
    const fee = {
      amount: [{ amount: feeAmount || gas, denom: feeCurrency.coinMinimalDenom }],
      gas: gasLimit || gas,
    };

    const txRaw = await client.sign(wallet.account.address, processedMessages, fee, memo || "");

    return {
      signatures: txRaw.signatures,
      response: txRaw,
    };
  }
}

export default OfflineDirectSigningClient;
