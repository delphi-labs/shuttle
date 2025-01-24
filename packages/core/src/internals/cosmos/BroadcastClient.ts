import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";

import { BroadcastResult, SigningResult } from "../../internals/transactions";
import type { Network, NetworkCurrency } from "../../internals/network";
import { isInjectiveNetwork } from "../../internals/network";
import InjectiveBroadcastClient from "../injective/InjectiveBroadcastClient";

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
      return await InjectiveBroadcastClient.execute({ network, signResult, overrides });
    }

    const client = await CosmWasmClient.connect(overrides?.rpc || network.rpc);

    const broadcast = await client.broadcastTx(TxRaw.encode(signResult.response).finish(), 15000, 2500);

    return {
      hash: broadcast.transactionHash,
      rawLogs: broadcast.rawLog || "",
      events: broadcast.events,
      response: broadcast,
    };
  }
}

export default BroadcastClient;
