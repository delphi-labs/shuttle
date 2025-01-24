import { calculateFee, GasPrice } from "@cosmjs/stargate";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";

import {
  DEFAULT_GAS_MULTIPLIER,
  DEFAULT_GAS_PRICE,
  Network,
  NetworkCurrency,
  isInjectiveNetwork,
} from "../../internals/network";
import { WalletConnection } from "../../internals/wallet";
import { SimulateResult, TransactionMsg } from "../../internals/transactions";
import { Fee } from "../../internals/cosmos";
import FakeOfflineSigner from "./FakeOfflineSigner";
import { extendedRegistryTypes } from "../registry";
import InjectiveSimulateClient from "../injective/InjectiveSimulateClient";

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
      gasPrice?: string;
      feeCurrency?: NetworkCurrency;
    };
  }): Promise<SimulateResult> {
    if (isInjectiveNetwork(network.chainId)) {
      return await InjectiveSimulateClient.run({ network, wallet, messages, overrides });
    }

    const signer = new FakeOfflineSigner(wallet);
    const gasPrice = GasPrice.fromString(overrides?.gasPrice ?? network.gasPrice ?? DEFAULT_GAS_PRICE);
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
        overrides?.gasPrice ?? network.gasPrice ?? DEFAULT_GAS_PRICE,
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
}

export default SimulateClient;
