import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { BroadcastMode, TxRestApi } from "@injectivelabs/sdk-ts";

import { BroadcastResult, SigningResult } from "../../internals/transactions";
import { Network, NetworkCurrency } from "../../internals/network";
import { isInjectiveNetwork } from "../../internals/injective";

export class BroadcastClient {
  static async execute({
    network,
    signResult,
    overrides,
  }: {
    network: Network;
    signResult: SigningResult;
    overrides?: {
      rpc?: string;
      rest?: string;
      gasAdjustment?: number;
      gasPrice?: string;
      feeCurrency?: NetworkCurrency;
    };
  }): Promise<BroadcastResult> {
    if (isInjectiveNetwork(network.chainId)) {
      return await this.injective({ network, signResult, overrides });
    }

    return await this.cosmos({ network, signResult, overrides });
  }

  static async cosmos({
    network,
    signResult,
    overrides,
  }: {
    network: Network;
    signResult: SigningResult;
    overrides?: {
      rpc?: string;
      rest?: string;
      gasAdjustment?: number;
      gasPrice?: string;
      feeCurrency?: NetworkCurrency;
    };
  }): Promise<BroadcastResult> {
    const client = await CosmWasmClient.connect(overrides?.rpc || network.rpc);

    const broadcast = await client.broadcastTx(TxRaw.encode(signResult.response).finish(), 15000, 2500);

    return {
      hash: broadcast.transactionHash,
      rawLogs: broadcast.rawLog || "",
      events: broadcast.events,
      response: broadcast,
    };
  }

  static async injective({
    network,
    signResult,
    overrides,
  }: {
    network: Network;
    signResult: SigningResult;
    overrides?: {
      rpc?: string;
      rest?: string;
      gasAdjustment?: number;
      gasPrice?: string;
      feeCurrency?: NetworkCurrency;
    };
  }): Promise<BroadcastResult> {
    const txRestApi = new TxRestApi(overrides?.rest || network.rest);

    const txRaw = TxRaw.fromPartial(signResult.response);

    const response = await txRestApi.broadcast(txRaw, {
      mode: BroadcastMode.Sync as any,
      timeout: 15000,
    });

    return {
      hash: response.txHash,
      rawLogs: response.rawLog,
      events: response.events ?? [],
      response: response,
    };
  }
}

export default BroadcastClient;
