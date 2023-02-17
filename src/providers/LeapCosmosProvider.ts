import { CosmWasmClient, SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { toBase64 } from "@cosmjs/encoding";
import { calculateFee, GasPrice } from "@cosmjs/stargate";
import { StdSignDoc } from "@cosmjs/amino";
import { AuthInfo, Fee as KeplrFee, TxBody, TxRaw } from "@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx";
import { SignMode } from "@keplr-wallet/proto-types/cosmos/tx/signing/v1beta1/signing";
import { PubKey } from "@keplr-wallet/proto-types/cosmos/crypto/secp256k1/keys";
import {
  BaseAccount,
  ChainRestAuthApi,
  createTransactionAndCosmosSignDoc,
  createTxRawFromSigResponse,
  TxRestApi,
  TxRaw as InjTxRaw,
} from "@injectivelabs/sdk-ts";

import { Keplr } from "../extensions";
import { defaultBech32Config, nonNullable } from "../utils";
import WalletProvider from "./WalletProvider";
import { Algo, WalletConnection } from "../internals/wallet";
import {
  DEFAULT_BIP44_COIN_TYPE,
  DEFAULT_CHAIN_PREFIX,
  DEFAULT_CURRENCY,
  DEFAULT_GAS_MULTIPLIER,
  DEFAULT_GAS_PRICE,
  Network,
} from "../internals/network";
import { TransactionMsg, BroadcastResult, Fee, SigningResult, SimulateResult } from "../internals/transaction";
import { isInjectiveNetwork, prepareMessagesForInjective } from "../internals/injective";

declare global {
  interface Window {
    leap?: Keplr;
  }
}

export const LeapCosmosProvider = class LeapCosmosProvider implements WalletProvider {
  id: string = "leap-cosmos";
  name: string = "Leap Cosmos";
  networks: Map<string, Network>;
  initializing: boolean = false;
  initialized: boolean = false;
  onUpdate?: () => void;

  leap?: Keplr;

  constructor({ id, name, networks }: { id?: string; name?: string; networks: Network[] }) {
    if (id) {
      this.id = id;
    }
    if (name) {
      this.name = name;
    }
    this.networks = new Map(networks.map((network) => [network.chainId, network]));
  }

  setOnUpdateCallback(callback: () => void): void {
    this.onUpdate = callback;
  }

  async init(): Promise<void> {
    if (this.initializing || this.initialized) {
      return;
    }

    this.initializing = true;

    if (!window.leap) {
      this.initializing = false;
      throw new Error("Leap is not available");
    }

    if (!window.leap.experimentalSuggestChain) {
      this.initializing = false;
      throw new Error("Leap does not support chain suggestion");
    }

    this.leap = window.leap;

    window.addEventListener("leap_keystorechange", () => {
      this.onUpdate?.();
    });

    this.initialized = true;
    this.initializing = false;
  }

  async connect({ chainId }: { chainId: string }): Promise<WalletConnection> {
    if (!this.leap) {
      throw new Error("Leap is not available");
    }

    const network = this.networks.get(chainId);

    if (!network) {
      throw new Error(`Network with chainId "${chainId}" not found`);
    }

    const defaultCurrency = network.defaultCurrency || DEFAULT_CURRENCY;
    const baseGasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);

    await this.leap.experimentalSuggestChain({
      chainId: network.chainId,
      chainName: network.name,
      name: network.name,
      rpc: network.rpc,
      rest: network.rest,
      bip44: {
        coinType: network.bip44?.coinType || DEFAULT_BIP44_COIN_TYPE,
      },
      bech32Config: network.bech32Config || defaultBech32Config(network.chainPrefix || DEFAULT_CHAIN_PREFIX),
      currencies: [defaultCurrency, network.stakeCurrency].filter(nonNullable),
      stakeCurrency: network.stakeCurrency ?? defaultCurrency,
      feeCurrencies: [
        ...(network.feeCurrencies
          ? network.feeCurrencies.map((currency) => {
              if (currency.gasPriceStep) return currency;
              return Object.assign(currency, {
                gasPriceStep: {
                  low: baseGasPrice.amount.toFloatApproximation(),
                  average: baseGasPrice.amount.toFloatApproximation() * 1.3,
                  high: baseGasPrice.amount.toFloatApproximation() * 2,
                },
              });
            })
          : []),
        Object.assign(defaultCurrency, {
          gasPriceStep: {
            low: baseGasPrice.amount.toFloatApproximation(),
            average: baseGasPrice.amount.toFloatApproximation() * 1.3,
            high: baseGasPrice.amount.toFloatApproximation() * 2,
          },
        }),
      ].filter(nonNullable),
      features: network.features || [],
    });

    await this.leap.enable(chainId);

    const account = (await this.leap.getKey(chainId)) as {
      address: Uint8Array;
      algo: string;
      bech32Address: string;
      isNanoLedger: boolean;
      name: string;
      pubKey: Uint8Array;
    };

    return {
      id: `provider:${this.id}:network:${network.chainId}:address:${account.bech32Address}`,
      providerId: this.id,
      account: {
        address: account.bech32Address,
        pubkey: toBase64(account.pubKey),
        algo: account.algo as Algo,
        isLedger: account.isNanoLedger,
      },
      network,
    };
  }

  async disconnect(): Promise<void> {
    return;
  }

  async simulate({
    messages,
    wallet,
  }: {
    messages: TransactionMsg[];
    wallet: WalletConnection;
  }): Promise<SimulateResult> {
    if (!this.leap) {
      throw new Error("Leap is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const connect = await this.connect({ chainId: network.chainId });

    if (connect.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    if (isInjectiveNetwork(network.chainId)) {
      const chainRestAuthApi = new ChainRestAuthApi(network.rest);
      const accountDetailsResponse = await chainRestAuthApi.fetchAccount(wallet.account.address);
      const baseAccount = BaseAccount.fromRestApi(accountDetailsResponse);

      const preparedMessages = prepareMessagesForInjective(messages);
      const preparedTx = createTransactionAndCosmosSignDoc({
        pubKey: wallet.account.pubkey || "",
        chainId: network.chainId,
        message: preparedMessages.map((msg) => msg.toDirectSign()),
        sequence: baseAccount.sequence,
        accountNumber: baseAccount.accountNumber,
      });

      const txRestApi = new TxRestApi(network.rest);
      const txRaw = preparedTx.txRaw;
      txRaw.setSignaturesList([new Uint8Array(0)]);
      const txClientSimulateResponse = await txRestApi.simulate(txRaw);

      try {
        const fee = calculateFee(
          Math.round((txClientSimulateResponse.gasInfo?.gasUsed || 0) * DEFAULT_GAS_MULTIPLIER),
          network.gasPrice || "0.0005inj",
        );

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
    } else {
      const offlineSigner = this.leap.getOfflineSigner(network.chainId);

      const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
      const client = await SigningCosmWasmClient.connectWithSigner(network.rpc, offlineSigner, { gasPrice });

      const processedMessages = messages.map((message) => message.toCosmosMsg());

      try {
        const gasEstimation = await client.simulate(wallet.account.address, processedMessages, "");

        const fee = calculateFee(
          Math.round(gasEstimation * DEFAULT_GAS_MULTIPLIER),
          network.gasPrice || DEFAULT_GAS_PRICE,
        );

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

  async broadcast({
    messages,
    wallet,
    feeAmount,
    gasLimit,
    memo,
  }: {
    messages: TransactionMsg[];
    wallet: WalletConnection;
    feeAmount?: string | null;
    gasLimit?: string | null;
    memo?: string | null;
    mobile?: boolean;
  }): Promise<BroadcastResult> {
    if (!this.leap) {
      throw new Error("Leap is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const connect = await this.connect({ chainId: network.chainId });

    if (connect.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    if (wallet.account.isLedger) {
      const client = await CosmWasmClient.connect(network.rpc);

      const signResult = await this.sign({ messages, wallet, feeAmount, gasLimit, memo });

      const broadcast = await client.broadcastTx(TxRaw.encode(signResult.response).finish(), 15000, 2500);

      return {
        hash: broadcast.transactionHash,
        rawLogs: broadcast.rawLog || "",
        response: broadcast,
      };
    }

    const offlineSigner = this.leap.getOfflineSigner(network.chainId);
    const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
    const client = await SigningCosmWasmClient.connectWithSigner(network.rpc, offlineSigner, { gasPrice });

    if (isInjectiveNetwork(network.chainId)) {
      const signResult = await this.sign({ messages, wallet, feeAmount, gasLimit, memo });
      const txRaw = signResult.response as InjTxRaw;

      const broadcast = await client.broadcastTx(txRaw.serializeBinary(), 15000, 2500);

      return {
        hash: broadcast.transactionHash,
        rawLogs: broadcast.rawLog || "",
        response: broadcast,
      };
    } else {
      const processedMessages = messages.map((message) => message.toCosmosMsg());

      let fee: "auto" | Fee = "auto";
      if (feeAmount && feeAmount != "auto") {
        const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
        const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
        fee = {
          amount: [{ amount: feeAmount || gas, denom: gasPrice.denom }],
          gas: gasLimit || gas,
        };
      }

      const broadcast = await client.signAndBroadcast(wallet.account.address, processedMessages, fee, memo || "");

      return {
        hash: broadcast.transactionHash,
        rawLogs: broadcast.rawLog || "",
        response: broadcast,
      };
    }
  }

  async sign({
    messages,
    wallet,
    feeAmount,
    gasLimit,
    memo,
  }: {
    messages: TransactionMsg[];
    wallet: WalletConnection;
    feeAmount?: string | null;
    gasLimit?: string | null;
    memo?: string | null;
    mobile?: boolean;
  }): Promise<SigningResult> {
    if (!this.leap) {
      throw new Error("Leap is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const connect = await this.connect({ chainId: network.chainId });

    if (connect.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    if (wallet.account.isLedger) {
      const offlineSigner = this.leap.getOfflineSigner(network.chainId);
      const client = await CosmWasmClient.connect(network.rpc);
      const accountInfo = await client.getAccount(wallet.account.address);

      const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
      const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
      const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);

      let fee: Fee = {
        amount: [{ amount: gas, denom: gasPrice.denom }],
        gas: gasLimit || gas,
      };
      if (feeAmount && feeAmount != "auto") {
        const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
        const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
        fee = {
          amount: [{ amount: feeAmount || gas, denom: gasPrice.denom }],
          gas: gasLimit || gas,
        };
      }

      const signDoc: StdSignDoc = {
        chain_id: network.chainId,
        account_number: accountInfo?.accountNumber.toString() || "",
        sequence: accountInfo?.sequence.toString() || "",
        fee,
        msgs: messages.map((message) => message.toAminoMsg()),
        memo: memo || "",
      };

      const signResponse = await offlineSigner.signAmino(wallet.account.address, signDoc);

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
              sequence: signResponse.signed.sequence,
            },
          ],
          fee: KeplrFee.fromPartial({
            amount: signResponse.signed.fee.amount as any,
            gasLimit: signResponse.signed.fee.gas,
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

    const offlineSigner = this.leap.getOfflineSigner(network.chainId);
    const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
    const client = await SigningCosmWasmClient.connectWithSigner(network.rpc, offlineSigner, { gasPrice });

    if (isInjectiveNetwork(network.chainId)) {
      const chainRestAuthApi = new ChainRestAuthApi(network.rest);
      const accountDetailsResponse = await chainRestAuthApi.fetchAccount(wallet.account.address);
      const baseAccount = BaseAccount.fromRestApi(accountDetailsResponse);

      let fee: Fee | undefined = undefined;
      if (feeAmount && feeAmount != "auto") {
        const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
        const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
        fee = {
          amount: [{ amount: feeAmount || gas, denom: gasPrice.denom }],
          gas: gasLimit || gas,
        };
      }

      const preparedMessages = prepareMessagesForInjective(messages);
      const preparedTx = createTransactionAndCosmosSignDoc({
        pubKey: wallet.account.pubkey || "",
        chainId: network.chainId,
        fee,
        message: preparedMessages.map((msg) => msg.toDirectSign()),
        sequence: baseAccount.sequence,
        accountNumber: baseAccount.accountNumber,
      });

      const directSignResponse = await offlineSigner.signDirect(wallet.account.address, preparedTx.cosmosSignDoc);
      const signing = createTxRawFromSigResponse(directSignResponse);

      return {
        signatures: signing.getSignaturesList_asU8(),
        response: signing,
      };
    } else {
      const processedMessages = messages.map((message) => message.toCosmosMsg());

      const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
      const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
      const fee = {
        amount: [{ amount: feeAmount || gas, denom: gasPrice.denom }],
        gas: gasLimit || gas,
      };
      const signing = await client.sign(wallet.account.address, processedMessages, fee, memo || "");

      return {
        signatures: signing.signatures,
        response: signing,
      };
    }
  }
};

export default LeapCosmosProvider;
