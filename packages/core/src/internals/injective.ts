import { EthereumChainId } from "@injectivelabs/ts-types";
import {
  MsgExecuteContractCompat as InjMsgExecuteContractCompat,
  MsgTransfer as InjMsgTransfer,
  MsgInstantiateContract as InjMsgInstantiateContract,
  MsgMigrateContract as InjMsgMigrateContract,
  MsgCreateSpotLimitOrder as InjMsgCreateSpotLimitOrder,
} from "@injectivelabs/sdk-ts";
import { BigNumberInBase } from "@injectivelabs/utils";

import { nonNullable } from "../utils";
import {
  MsgExecuteContract,
  MsgInstantiateContract,
  MsgMigrateContract,
  MsgTransfer,
  TransactionMsg,
  MsgCreateSpotLimitOrder,
} from "./transactions";

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

export type InjTransactionMsg =
  | InjMsgExecuteContractCompat
  | InjMsgInstantiateContract
  | InjMsgMigrateContract
  | InjMsgTransfer
  | InjMsgCreateSpotLimitOrder;

export function prepareMessagesForInjective(messages: TransactionMsg[]): InjTransactionMsg[] {
  return messages
    .map((msg) => {
      if (msg.typeUrl === MsgExecuteContract.TYPE) {
        const execMsg = msg as MsgExecuteContract;

        return InjMsgExecuteContractCompat.fromJSON({
          sender: execMsg.value.sender,
          contractAddress: execMsg.value.contract,
          msg: execMsg.value.msg,
          funds: execMsg.value.funds && execMsg.value.funds.length > 0 ? execMsg.value.funds : undefined,
        });
      }

      if (msg.typeUrl === MsgInstantiateContract.TYPE) {
        const instantiateMsg = msg as MsgInstantiateContract;

        return InjMsgInstantiateContract.fromJSON({
          sender: instantiateMsg.value.sender,
          admin: instantiateMsg.value.admin,
          codeId: Number(instantiateMsg.value.codeId),
          label: instantiateMsg.value.label ?? "",
          msg: instantiateMsg.value.msg,
          amount:
            instantiateMsg.value.funds && instantiateMsg.value.funds.length > 0
              ? instantiateMsg.value.funds[0]
              : undefined,
        });
      }

      if (msg.typeUrl === MsgMigrateContract.TYPE) {
        const migrateMsg = msg as MsgMigrateContract;

        return InjMsgMigrateContract.fromJSON({
          sender: migrateMsg.value.sender,
          contract: migrateMsg.value.contract,
          codeId: Number(migrateMsg.value.codeId),
          msg: migrateMsg.value.msg,
        });
      }

      if (msg.typeUrl === MsgTransfer.TYPE) {
        const execMsg = msg as MsgTransfer;

        if (!execMsg.value.timeoutHeight) {
          throw new Error("Injective IBC transfer requires timeout height");
        }

        return InjMsgTransfer.fromJSON({
          memo: "IBC Transfer",
          sender: execMsg.value.sender,
          receiver: execMsg.value.receiver,
          port: execMsg.value.sourcePort,
          channelId: execMsg.value.sourceChannel,
          amount: execMsg.value.token ?? { denom: "", amount: "" },
          timeout: new BigNumberInBase(execMsg.value.timeoutTimestamp).toNumber(),
          height: {
            revisionHeight: new BigNumberInBase(execMsg.value.timeoutHeight.revisionHeight).toNumber(),
            revisionNumber: new BigNumberInBase(execMsg.value.timeoutHeight.revisionNumber).toNumber(),
          },
        });
      }

      if (msg.typeUrl === MsgCreateSpotLimitOrder.TYPE) {
        const createSpotLimitOrderMsg = msg as MsgCreateSpotLimitOrder;

        return InjMsgCreateSpotLimitOrder.fromJSON({
          subaccountId: createSpotLimitOrderMsg.value.order.subaccountId,
          injectiveAddress: createSpotLimitOrderMsg.value.sender,
          marketId: createSpotLimitOrderMsg.value.order.marketId,
          feeRecipient: createSpotLimitOrderMsg.value.order.feeRecipient,
          price: createSpotLimitOrderMsg.value.order.price,
          quantity: createSpotLimitOrderMsg.value.order.quantity,
          orderType: createSpotLimitOrderMsg.value.order.orderType,
        });
      }

      return null;
    })
    .filter(nonNullable);
}
