import { EthereumChainId } from "@injectivelabs/ts-types";
import {
  MsgSend as InjMsgSend,
  MsgExecuteContractCompat as InjMsgExecuteContractCompat,
  MsgTransfer as InjMsgTransfer,
  MsgInstantiateContract as InjMsgInstantiateContract,
  MsgMigrateContract as InjMsgMigrateContract,
  MsgCreateSpotLimitOrder as InjMsgCreateSpotLimitOrder,
  MsgCancelSpotOrder as InjMsgCancelSpotOrder,
} from "@injectivelabs/sdk-ts";
import { BigNumberInBase } from "@injectivelabs/utils";

import { nonNullable } from "../utils";
import {
  MsgSend,
  MsgExecuteContract,
  MsgInstantiateContract,
  MsgMigrateContract,
  MsgTransfer,
  TransactionMsg,
  MsgCreateSpotLimitOrder,
  MsgCancelSpotOrder,
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
  | InjMsgSend
  | InjMsgExecuteContractCompat
  | InjMsgInstantiateContract
  | InjMsgMigrateContract
  | InjMsgTransfer
  | InjMsgCreateSpotLimitOrder
  | InjMsgCancelSpotOrder;

export function prepareMessagesForInjective(messages: TransactionMsg[]): InjTransactionMsg[] {
  return messages
    .map((msg) => {
      if (msg.typeUrl === MsgSend.TYPE) {
        const sendMsg = msg as MsgSend;

        return InjMsgSend.fromJSON({
          srcInjectiveAddress: sendMsg.value.fromAddress,
          dstInjectiveAddress: sendMsg.value.toAddress,
          amount: sendMsg.value.amount,
        });
      }

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
          timeout: execMsg.value.timeoutTimestamp ? new BigNumberInBase(execMsg.value.timeoutTimestamp).toNumber() : 0,
          height: execMsg.value.timeoutHeight
            ? {
                revisionHeight: new BigNumberInBase(execMsg.value.timeoutHeight.revisionHeight).toNumber(),
                revisionNumber: new BigNumberInBase(execMsg.value.timeoutHeight.revisionNumber).toNumber(),
              }
            : undefined,
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

      if (msg.typeUrl === MsgCancelSpotOrder.TYPE) {
        const cancelSpotOrderMsg = msg as MsgCancelSpotOrder;

        return InjMsgCancelSpotOrder.fromJSON({
          injectiveAddress: cancelSpotOrderMsg.value.sender,
          marketId: cancelSpotOrderMsg.value.market_id,
          subaccountId: cancelSpotOrderMsg.value.subaccount_id,
          orderHash: cancelSpotOrderMsg.value.order_hash,
        });
      }

      return null;
    })
    .filter(nonNullable);
}
