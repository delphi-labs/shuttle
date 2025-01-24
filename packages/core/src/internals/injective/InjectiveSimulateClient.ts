import { calculateFee } from "@cosmjs/stargate";
import { BaseAccount, ChainRestAuthApi, createTransactionAndCosmosSignDoc, TxRestApi } from "@injectivelabs/sdk-ts";

import { DEFAULT_GAS_MULTIPLIER, Network, NetworkCurrency } from "../../internals/network";
import { WalletConnection } from "../../internals/wallet";
import { SimulateResult, TransactionMsg } from "../../internals/transactions";
import { prepareMessagesForInjective } from "../../internals/injective";
import { Fee } from "../../internals/cosmos";

export class InjectiveSimulateClient {
  static async run({
    network,
    wallet,
    messages,
    overrides,
  }: {
    network: Network;
    wallet: WalletConnection;
    messages: TransactionMsg[];
    overrides?: {
      rpc?: string;
      rest?: string;
      gasAdjustment?: number;
      gasPrice?: string;
      feeCurrency?: NetworkCurrency;
    };
  }): Promise<SimulateResult> {
    const chainRestAuthApi = new ChainRestAuthApi(overrides?.rest ?? network.rest);
    const accountDetailsResponse = await chainRestAuthApi.fetchAccount(wallet.account.address);
    const baseAccount = BaseAccount.fromRestApi(accountDetailsResponse);

    const preparedTx = createTransactionAndCosmosSignDoc({
      pubKey: wallet.account.pubkey || "",
      chainId: network.chainId,
      message: prepareMessagesForInjective(messages),
      sequence: baseAccount.sequence,
      accountNumber: baseAccount.accountNumber,
    });

    const txRestApi = new TxRestApi(overrides?.rest ?? network.rest);
    const txRaw = preparedTx.txRaw;
    txRaw.signatures = [new Uint8Array(0)];

    try {
      const txClientSimulateResponse = await txRestApi.simulate(txRaw);

      const fee = calculateFee(
        Math.round(
          (txClientSimulateResponse.gasInfo?.gasUsed || 0) * (overrides?.gasAdjustment ?? DEFAULT_GAS_MULTIPLIER),
        ),
        overrides?.gasPrice ?? network.gasPrice ?? "0.0005inj",
      ) as Fee;

      return {
        success: true,
        fee,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.originalMessage || error?.message,
      };
    }
  }
}

export default InjectiveSimulateClient;
