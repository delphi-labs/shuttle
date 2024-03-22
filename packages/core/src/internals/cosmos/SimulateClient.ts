import { calculateFee, GasPrice } from "@cosmjs/stargate";
import { BaseAccount, ChainRestAuthApi, createTransactionAndCosmosSignDoc, TxRestApi } from "@injectivelabs/sdk-ts";

import { DEFAULT_GAS_MULTIPLIER, DEFAULT_GAS_PRICE, Network } from "../../internals/network";
import { WalletConnection } from "../../internals/wallet";
import { SimulateResult, TransactionMsg } from "../../internals/transactions";
import { isInjectiveNetwork, prepareMessagesForInjective } from "../../internals/injective";
import { Fee } from "../../internals/cosmos";
import FakeOfflineSigner from "./FakeOfflineSigner";
import { extendedRegistryTypes } from "../registry";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";

export class SimulateClient {
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
    };
  }): Promise<SimulateResult> {
    if (isInjectiveNetwork(network.chainId)) {
      return await this.injective({ network, wallet, messages, overrides });
    }

    return await this.cosmos({ network, wallet, messages, overrides });
  }

  static async cosmos({
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
    };
  }): Promise<SimulateResult> {
    const signer = new FakeOfflineSigner(wallet);
    const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
    const client = await SigningCosmWasmClient.connectWithSigner(overrides?.rpc ?? network.rpc, signer, {
      gasPrice,
    });
    for (const [typeUrl, type] of extendedRegistryTypes) {
      client.registry.register(typeUrl, type);
    }

    const processedMessages = messages.map((message) => message.toCosmosMsg());

    try {
      const gasEstimation = await client.simulate(wallet.account.address, processedMessages, "");

      const fee = calculateFee(
        Math.round(gasEstimation * (overrides?.gasAdjustment ?? DEFAULT_GAS_MULTIPLIER)),
        network.gasPrice || DEFAULT_GAS_PRICE,
      ) as Fee;

      return {
        success: true,
        fee,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message,
      };
    }
  }

  static async injective({
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
        network.gasPrice || "0.0005inj",
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

export default SimulateClient;
