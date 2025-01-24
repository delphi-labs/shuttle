import { StdSignDoc } from "@cosmjs/amino";
import { GasPrice } from "@cosmjs/stargate";
import { BaseAccount, ChainRestAuthApi } from "@injectivelabs/sdk-ts";
import { BigNumberInBase } from "@injectivelabs/utils";

import type { TransactionMsg } from "../../internals/transactions/messages";
import type { WalletConnection } from "../../internals/wallet";
import type { Fee } from "../../internals/cosmos";
import type { Network, NetworkCurrency } from "../../internals/network";
import { DEFAULT_CURRENCY, DEFAULT_GAS_PRICE } from "../../internals/network";

export class InjectiveAminoSigningClient {
  static async prepare({
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
      gasPrice?: string;
      feeCurrency?: NetworkCurrency;
    };
  }): Promise<StdSignDoc> {
    const gasPrice = GasPrice.fromString(overrides?.gasPrice ?? network.gasPrice ?? DEFAULT_GAS_PRICE);
    const feeCurrency =
      overrides?.feeCurrency ?? network.feeCurrencies?.[0] ?? network.defaultCurrency ?? DEFAULT_CURRENCY;
    const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);

    let accountNumber = "";
    let sequence = "";
    let fee: Fee = {
      amount: [{ amount: gas, denom: feeCurrency.coinMinimalDenom }],
      gas: gasLimit || gas,
    };

    const chainRestAuthApi = new ChainRestAuthApi(overrides?.rest ?? network.rest);
    const accountDetailsResponse = await chainRestAuthApi.fetchAccount(wallet.account.address);
    const baseAccount = BaseAccount.fromRestApi(accountDetailsResponse);
    accountNumber = baseAccount.accountNumber.toString() || "";
    sequence = baseAccount.sequence.toString() || "";

    if (feeAmount && feeAmount != "auto") {
      feeAmount = String(new BigNumberInBase(feeAmount).times(10 ** (feeCurrency.coinDecimals - 6)).toFixed(0));
      fee = {
        amount: [{ amount: feeAmount || gas, denom: feeCurrency.coinMinimalDenom }],
        gas: gasLimit || gas,
      };
    }

    return {
      chain_id: network.chainId,
      account_number: accountNumber,
      sequence,
      fee,
      msgs: messages.map((message) => message.toAminoMsg()),
      memo: memo || "",
    };
  }
}

export default InjectiveAminoSigningClient;
