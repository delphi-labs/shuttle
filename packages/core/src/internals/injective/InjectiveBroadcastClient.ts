import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { BroadcastMode, TxRestApi } from "@injectivelabs/sdk-ts";

import { BroadcastResult, SigningResult } from "../../internals/transactions";
import type { Network, NetworkCurrency } from "../../internals/network";

export class InjectiveBroadcastClient {
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

export default InjectiveBroadcastClient;
