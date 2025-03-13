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
import type { Network, NetworkCurrency } from "../../internals/network";
import { DEFAULT_CURRENCY, DEFAULT_GAS_PRICE } from "../../internals/network";
import { prepareMessagesForInjective } from "../../internals/injective";

export class InjectiveOfflineDirectSigningClient {
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
    const chainRestAuthApi = new ChainRestAuthApi(overrides?.rest ?? network.rest);
    const accountDetailsResponse = await chainRestAuthApi.fetchAccount(wallet.account.address);
    const baseAccount = BaseAccount.fromRestApi(accountDetailsResponse);

    const gasPrice = GasPrice.fromString(overrides?.gasPrice ?? network.gasPrice ?? DEFAULT_GAS_PRICE);
    let computedFee = fee ?? undefined;
    if (!fee && feeAmount && feeAmount != "auto") {
      const feeCurrency =
        overrides?.feeCurrency ?? network.feeCurrencies?.[0] ?? network.defaultCurrency ?? DEFAULT_CURRENCY;
      const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
      computedFee = {
        amount: [{ amount: feeAmount || gas, denom: feeCurrency.coinMinimalDenom }],
        gas: gasLimit || gas,
      };
    }

    const preparedTx = createTransactionAndCosmosSignDoc({
      pubKey: wallet.account.pubkey || "",
      chainId: network.chainId,
      fee: computedFee,
      message: prepareMessagesForInjective(messages),
      sequence: baseAccount.sequence,
      accountNumber: baseAccount.accountNumber,
      memo: memo ?? "",
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
}

export default InjectiveOfflineDirectSigningClient;
