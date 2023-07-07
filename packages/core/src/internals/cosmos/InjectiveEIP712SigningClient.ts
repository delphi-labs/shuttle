import { GasPrice } from "@cosmjs/stargate";
import type { StdSignDoc } from "@cosmjs/amino";
import {
  BaseAccount,
  ChainRestAuthApi,
  createWeb3Extension,
  createTxRawEIP712,
  createTransaction,
  SIGN_AMINO,
  getEip712TypedData,
  ChainRestTendermintApi,
} from "@injectivelabs/sdk-ts";
import { BigNumberInBase, DEFAULT_BLOCK_TIMEOUT_HEIGHT } from "@injectivelabs/utils";

import {
  type InjTransactionMsg,
  fromInjectiveCosmosChainToEthereumChain,
  prepareMessagesForInjective,
} from "../../internals/injective";
import { DEFAULT_CURRENCY, DEFAULT_GAS_PRICE, type Network } from "../../internals/network";
import type { WalletConnection } from "../../internals/wallet";
import type { SigningResult } from "../../internals/transactions";
import type { TransactionMsg } from "../../internals/transactions/messages";
import type { Fee } from "./";

export type Eip712TypedData = ReturnType<typeof getEip712TypedData>;

export class InjectiveEIP712SigningClient {
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
    };
  }): Promise<{
    messages: InjTransactionMsg[];
    eip712TypedData: Eip712TypedData;
    signDoc: StdSignDoc & { timeout_height: string };
  }> {
    const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
    const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
    const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);

    let fee: Fee = {
      amount: [{ amount: gas, denom: feeCurrency.coinMinimalDenom }],
      gas: gasLimit || gas,
    };
    if (feeAmount && feeAmount != "auto") {
      fee = {
        amount: [{ amount: feeAmount || gas, denom: feeCurrency.coinMinimalDenom }],
        gas: gasLimit || gas,
      };
    }

    const chainRestAuthApi = new ChainRestAuthApi(overrides?.rest ?? network.rest);
    const accountDetailsResponse = await chainRestAuthApi.fetchAccount(wallet.account.address);
    const baseAccount = BaseAccount.fromRestApi(accountDetailsResponse);

    const chainRestTendermintApi = new ChainRestTendermintApi(overrides?.rest ?? network.rest);
    const latestBlock = await chainRestTendermintApi.fetchLatestBlock();
    const latestHeight = latestBlock.header.height;
    const timeoutHeight = new BigNumberInBase(latestHeight).plus(DEFAULT_BLOCK_TIMEOUT_HEIGHT);

    const preparedMessages = prepareMessagesForInjective(messages);
    const eip712TypedData = getEip712TypedData({
      msgs: preparedMessages,
      tx: {
        memo: memo || "",
        accountNumber: baseAccount.accountNumber.toString(),
        sequence: baseAccount.sequence.toString(),
        chainId: network.chainId,
        timeoutHeight: timeoutHeight.toFixed(),
      },
      fee,
      ethereumChainId: fromInjectiveCosmosChainToEthereumChain(network.chainId),
    });

    return {
      messages: preparedMessages,
      eip712TypedData,
      signDoc: {
        chain_id: network.chainId,
        timeout_height: timeoutHeight.toFixed(),
        account_number: baseAccount.accountNumber.toString(),
        sequence: baseAccount.sequence.toString(),
        fee,
        msgs: preparedMessages.map((m) => m.toEip712()),
        memo: memo || "",
      },
    };
  }

  static async finish({
    network,
    pubKey,
    messages,
    signDoc,
    signature,
  }: {
    network: Network;
    pubKey: string;
    messages: InjTransactionMsg[];
    signDoc: StdSignDoc & { timeout_height?: string };
    signature: Uint8Array;
  }): Promise<SigningResult> {
    const preparedTx = createTransaction({
      message: messages,
      memo: signDoc.memo,
      signMode: SIGN_AMINO,
      fee: signDoc.fee,
      pubKey,
      sequence: parseInt(signDoc.sequence, 10),
      timeoutHeight: parseInt(signDoc.timeout_height || "0", 10),
      accountNumber: parseInt(signDoc.account_number, 10),
      chainId: network.chainId,
    });

    const web3Extension = createWeb3Extension({
      ethereumChainId: fromInjectiveCosmosChainToEthereumChain(network.chainId),
    });

    const txRawEip712 = createTxRawEIP712(preparedTx.txRaw, web3Extension);
    txRawEip712.signatures = [signature];

    return {
      signatures: txRawEip712.signatures,
      response: txRawEip712,
    };
  }
}

export default InjectiveEIP712SigningClient;
