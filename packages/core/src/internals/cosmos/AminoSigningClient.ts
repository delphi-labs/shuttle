import { AminoSignResponse, StdSignDoc } from "@cosmjs/amino";
import { GasPrice } from "@cosmjs/stargate";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { TxRaw, TxBody, AuthInfo, Fee as CosmosFee } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { PubKey } from "cosmjs-types/cosmos/crypto/secp256k1/keys";

import type { SigningResult } from "../../internals/transactions";
import type { TransactionMsg } from "../../internals/transactions/messages";
import type { WalletConnection } from "../../internals/wallet";
import type { Coin, Fee } from "../../internals/cosmos";
import type { Network, NetworkCurrency } from "../../internals/network";
import { DEFAULT_CURRENCY, DEFAULT_GAS_PRICE, isInjectiveNetwork } from "../../internals/network";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import InjectiveAminoSigningClient from "../injective/InjectiveAminoSigningClient";

export class AminoSigningClient {
  static async prepare({
    network,
    wallet,
    messages,
    fee,
    feeAmount,
    gasLimit,
    memo,
    overrides,
  }: {
    network: Network;
    wallet: WalletConnection;
    messages: TransactionMsg[];
    fee?: Fee | null;
    feeAmount?: string | null;
    gasLimit?: string | null;
    memo?: string | null;
    overrides?: {
      rpc?: string;
      rest?: string;
      gasAdjustment?: number;
      gasPrice?: string;
      feeCurrency?: NetworkCurrency;
    };
  }): Promise<StdSignDoc> {
    if (isInjectiveNetwork(network.chainId)) {
      return await InjectiveAminoSigningClient.prepare({
        network,
        wallet,
        messages,
        fee,
        feeAmount,
        gasLimit,
        memo,
        overrides,
      });
    }

    const gasPrice = GasPrice.fromString(overrides?.gasPrice ?? network.gasPrice ?? DEFAULT_GAS_PRICE);
    const feeCurrency =
      overrides?.feeCurrency ?? network.feeCurrencies?.[0] ?? network.defaultCurrency ?? DEFAULT_CURRENCY;
    const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);

    let accountNumber = "";
    let sequence = "";
    let computedFee: Fee = fee ?? {
      amount: [{ amount: gas, denom: feeCurrency.coinMinimalDenom }],
      gas: gasLimit || gas,
    };
    const client = await CosmWasmClient.connect(overrides?.rpc ?? network.rpc);
    const accountInfo = await client.getAccount(wallet.account.address);
    accountNumber = accountInfo?.accountNumber.toString() || "";
    sequence = accountInfo?.sequence.toString() || "";

    if (!fee && feeAmount && feeAmount != "auto") {
      computedFee = {
        amount: [{ amount: feeAmount || gas, denom: feeCurrency.coinMinimalDenom }],
        gas: gasLimit || gas,
      };
    }

    return {
      chain_id: network.chainId,
      account_number: accountNumber,
      sequence,
      fee: computedFee,
      msgs: messages.map((message) => message.toAminoMsg()),
      memo: memo || "",
    };
  }

  static async finish({
    network,
    messages,
    signResponse,
    memo,
  }: {
    network: Network;
    messages: TransactionMsg[];
    signResponse: AminoSignResponse;
    memo?: string | null;
  }): Promise<SigningResult> {
    const signedTx = TxRaw.encode({
      bodyBytes: TxBody.encode(
        TxBody.fromPartial({
          messages: messages.map((m) => m.toProtoMsg()) as any,
          memo: memo || "",
        }),
      ).finish(),
      authInfoBytes: AuthInfo.encode({
        signerInfos: [
          {
            publicKey: {
              typeUrl: (() => {
                if (isInjectiveNetwork(network.chainId)) {
                  return "/injective.crypto.v1beta1.ethsecp256k1.PubKey";
                }

                return "/cosmos.crypto.secp256k1.PubKey";
              })(),
              value: PubKey.encode({
                key: Buffer.from(signResponse.signature.pub_key.value, "base64"),
              }).finish(),
            },
            modeInfo: {
              single: {
                mode: SignMode.SIGN_MODE_LEGACY_AMINO_JSON,
              },
              multi: undefined,
            },
            sequence: BigInt(signResponse.signed.sequence),
          },
        ],
        fee: CosmosFee.fromPartial({
          amount: signResponse.signed.fee.amount as Coin[],
          gasLimit: BigInt(signResponse.signed.fee.gas),
          payer: undefined,
        }),
      }).finish(),
      signatures: [Buffer.from(signResponse.signature.signature, "base64")],
    }).finish();

    return {
      signatures: TxRaw.decode(signedTx).signatures,
      response: TxRaw.decode(signedTx),
    };
  }
}

export default AminoSigningClient;
