import { EthereumChainId } from "@injectivelabs/ts-types";
import {
  MsgExecuteContractCompat as InjMsgExecuteContractCompat,
  MsgTransfer as InjMsgTransfer,
} from "@injectivelabs/sdk-ts";

import { MsgExecuteContract, MsgTransfer, TransactionMsg } from "./transaction";
import { nonNullable } from "../utils";

export function isInjectiveNetwork(chainId: string): boolean {
  return chainId === "injective-1" || chainId === "injective-888";
}

export function fromInjectiveCosmosChainToEthereumChain(chainId: string): number {
  if (chainId === "injective-1") {
    return EthereumChainId.Mainnet;
  } else if (chainId === "injective-888") {
    return EthereumChainId.Goerli;
  } else {
    throw new Error(`Invalid Injective chainId: ${chainId}`);
  }
}

export function fromInjectiveEthereumChainToCosmosChain(chainNumber: number): string {
  if (chainNumber === EthereumChainId.Mainnet) {
    return "injective-1";
  } else if (chainNumber === EthereumChainId.Goerli) {
    return "injective-888";
  } else {
    throw new Error(`Invalid Injective EVM chainId: ${chainNumber}`);
  }
}

export function prepareMessagesForInjective(
  messages: TransactionMsg[],
): (InjMsgExecuteContractCompat | InjMsgTransfer)[] {
  return messages
    .map((msg) => {
      if (msg.typeUrl === MsgExecuteContract.TYPE) {
        const execMsg = msg as MsgExecuteContract;

        return InjMsgExecuteContractCompat.fromJSON({
          sender: execMsg.value.sender,
          contractAddress: execMsg.value.contract,
          msg: execMsg.value.msg,
          funds: execMsg.value.funds,
        });
      }

      if (msg.typeUrl === MsgTransfer.TYPE) {
        const execMsg = msg as MsgTransfer;

        return InjMsgTransfer.fromJSON({
          sender: execMsg.value.sender,
          receiver: execMsg.value.receiver,
          port: execMsg.value.sourcePort,
          channelId: execMsg.value.sourceChannel,
          amount: execMsg.value.token ?? { denom: "", amount: "" },
          timeout: execMsg.value.timeoutTimestamp.toNumber() || 1,
          height: {
            revisionHeight: execMsg.value.timeoutHeight?.revisionHeight?.toNumber() || 1,
            revisionNumber: execMsg.value.timeoutHeight?.revisionNumber?.toNumber() || 1,
          },
        });
      }

      return null;
    })
    .filter(nonNullable);
}
