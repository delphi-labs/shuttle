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
  getEip712TypedData,
  ChainRestTendermintApi,
  createTransaction,
  SIGN_AMINO,
  createWeb3Extension,
  createTxRawEIP712,
  BroadcastMode,
} from "@injectivelabs/sdk-ts";
import { BigNumberInBase, DEFAULT_BLOCK_TIMEOUT_HEIGHT } from "@injectivelabs/utils";

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
import { TransactionMsg, BroadcastResult, SigningResult, SimulateResult } from "../internals/transaction";
import { Fee } from "../internals/cosmos";
import {
  fromInjectiveCosmosChainToEthereumChain,
  isInjectiveNetwork,
  prepareMessagesForInjective,
} from "../internals/injective";

declare global {
  interface Window {
    keplr?: Keplr;
  }
}

export const KeplrProvider = class KeplrProvider implements WalletProvider {
  id: string = "keplr";
  name: string = "Keplr";
  networks: Map<string, Network>;
  initializing: boolean = false;
  initialized: boolean = false;
  onUpdate?: () => void;

  keplr?: Keplr;

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

    if (!window.keplr) {
      this.initializing = false;
      throw new Error("Keplr is not available");
    }

    if (!window.keplr.experimentalSuggestChain) {
      this.initializing = false;
      throw new Error("Keplr does not support chain suggestion");
    }

    this.keplr = window.keplr;

    window.addEventListener("keplr_keystorechange", () => {
      this.onUpdate?.();
    });

    this.initialized = true;
    this.initializing = false;
  }

  async connect({ chainId }: { chainId: string }): Promise<WalletConnection> {
    if (!this.keplr) {
      throw new Error("Keplr is not available");
    }

    const network = this.networks.get(chainId);

    if (!network) {
      throw new Error(`Network with chainId "${chainId}" not found`);
    }

    const defaultCurrency = network.defaultCurrency || DEFAULT_CURRENCY;
    const baseGasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
    await this.keplr.experimentalSuggestChain({
      ...network,
      chainName: network.name,
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

    await this.keplr.enable(chainId);

    const account = (await this.keplr.getKey(chainId)) as {
      address: Uint8Array;
      algo: string;
      bech32Address: string;
      isKeystone: boolean;
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
    if (!this.keplr) {
      throw new Error("Keplr is not available");
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

      try {
        const txClientSimulateResponse = await txRestApi.simulate(txRaw);

        const fee = calculateFee(
          Math.round((txClientSimulateResponse.gasInfo?.gasUsed || 0) * DEFAULT_GAS_MULTIPLIER),
          network.gasPrice || "0.0005inj",
        ) as Fee;

        return {
          success: true,
          fee,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error?.errorMessage || error?.message,
        };
      }
    } else {
      const offlineSigner = this.keplr.getOfflineSigner(network.chainId);

      const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
      const client = await SigningCosmWasmClient.connectWithSigner(network.rpc, offlineSigner, { gasPrice });

      const processedMessages = messages.map((message) => message.toCosmosMsg());

      try {
        const gasEstimation = await client.simulate(wallet.account.address, processedMessages, "");

        const fee = calculateFee(
          Math.round(gasEstimation * DEFAULT_GAS_MULTIPLIER),
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
  }

  async broadcast({
    messages,
    wallet,
    feeAmount,
    gasLimit,
    memo,
    overrides,
  }: {
    messages: TransactionMsg[];
    wallet: WalletConnection;
    feeAmount?: string | null;
    gasLimit?: string | null;
    memo?: string | null;
    mobile?: boolean;
    overrides?: {
      rpc?: string;
      rest?: string;
    };
  }): Promise<BroadcastResult> {
    if (!this.keplr) {
      throw new Error("Keplr is not available");
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
      const client = await CosmWasmClient.connect(overrides?.rpc || network.rpc);

      const signResult = await this.sign({ messages, wallet, feeAmount, gasLimit, memo });

      if (isInjectiveNetwork(network.chainId)) {
        const txRaw = signResult.response as InjTxRaw;

        const txRestApi = new TxRestApi(network.rest);

        const broadcast = await txRestApi.broadcast(txRaw, {
          mode: BroadcastMode.Sync as any,
          timeout: 15000,
        });

        return {
          hash: broadcast.txHash,
          rawLogs: broadcast.rawLog || "",
          response: broadcast,
        };
      } else {
        const broadcast = await client.broadcastTx(TxRaw.encode(signResult.response).finish(), 15000, 2500);

        return {
          hash: broadcast.transactionHash,
          rawLogs: broadcast.rawLog || "",
          response: broadcast,
        };
      }
    }

    const offlineSigner = this.keplr.getOfflineSigner(network.chainId);
    const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
    const client = await SigningCosmWasmClient.connectWithSigner(overrides?.rpc || network.rpc, offlineSigner, {
      gasPrice,
    });

    if (isInjectiveNetwork(network.chainId)) {
      const signResult = await this.sign({ messages, wallet, feeAmount, gasLimit, memo });
      const txRaw = signResult.response as InjTxRaw;

      const txRestApi = new TxRestApi(network.rest);

      const broadcast = await txRestApi.broadcast(txRaw, {
        mode: BroadcastMode.Sync as any,
        timeout: 15000,
      });

      return {
        hash: broadcast.txHash,
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
    if (!this.keplr) {
      throw new Error("Keplr is not available");
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

      if (isInjectiveNetwork(network.chainId)) {
        const chainRestAuthApi = new ChainRestAuthApi(wallet.network.rest);
        const accountDetailsResponse = await chainRestAuthApi.fetchAccount(wallet.account.address);
        const baseAccount = BaseAccount.fromRestApi(accountDetailsResponse);

        const chainRestTendermintApi = new ChainRestTendermintApi(network.rest);
        const latestBlock = await chainRestTendermintApi.fetchLatestBlock();
        const latestHeight = latestBlock.header.height;
        const timeoutHeight = new BigNumberInBase(latestHeight).plus(DEFAULT_BLOCK_TIMEOUT_HEIGHT);

        const preparedMessages = prepareMessagesForInjective(messages);
        const eip712TypedData = getEip712TypedData({
          msgs: preparedMessages,
          tx: {
            memo: memo || "",
            accountNumber: baseAccount.accountNumber.toString(),
            sequence: baseAccount.sequence.toString(),
            chainId: network.chainId,
            timeoutHeight: timeoutHeight.toFixed(),
          },
          fee,
          ethereumChainId: fromInjectiveCosmosChainToEthereumChain(network.chainId),
        });

        const signDoc = {
          chain_id: network.chainId,
          timeout_height: timeoutHeight.toFixed(),
          account_number: baseAccount.accountNumber.toString(),
          sequence: baseAccount.sequence.toString(),
          fee,
          msgs: preparedMessages.map((m) => m.toEip712()),
          memo: memo || "",
        };

        const aminoSignResponse = await this.keplr!.experimentalSignEIP712CosmosTx_v0(
          network.chainId,
          wallet.account.address,
          eip712TypedData,
          signDoc,
        );

        const preparedTx = createTransaction({
          message: preparedMessages.map((m) => m.toDirectSign()),
          memo: aminoSignResponse.signed.memo,
          signMode: SIGN_AMINO,
          fee: aminoSignResponse.signed.fee,
          pubKey: wallet.account.pubkey || "",
          sequence: parseInt(aminoSignResponse.signed.sequence, 10),
          timeoutHeight: parseInt((aminoSignResponse.signed as any).timeout_height, 10),
          accountNumber: parseInt(aminoSignResponse.signed.account_number, 10),
          chainId: network.chainId,
        });

        const web3Extension = createWeb3Extension({
          ethereumChainId: fromInjectiveCosmosChainToEthereumChain(network.chainId),
        });

        const txRawEip712 = createTxRawEIP712(preparedTx.txRaw, web3Extension);

        const signatureBuff = Buffer.from(aminoSignResponse.signature.signature, "base64");
        txRawEip712.setSignaturesList([signatureBuff]);

        return {
          signatures: txRawEip712.getSignaturesList_asU8(),
          response: txRawEip712,
        };
      } else {
        const client = await CosmWasmClient.connect(network.rpc);
        const accountInfo = await client.getAccount(wallet.account.address);
        const accountNumber = accountInfo?.accountNumber.toString() || "";
        const sequence = accountInfo?.sequence.toString() || "";

        const signDoc: StdSignDoc = {
          chain_id: network.chainId,
          account_number: accountNumber,
          sequence,
          fee,
          msgs: messages.map((message) => message.toAminoMsg()),
          memo: memo || "",
        };
        const signResponse = await this.keplr.signAmino(network.chainId, wallet.account.address, signDoc);

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
    }

    const offlineSigner = this.keplr.getOfflineSigner(network.chainId);
    const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
    const client = await SigningCosmWasmClient.connectWithSigner(network.rpc, offlineSigner, { gasPrice });

    if (isInjectiveNetwork(network.chainId)) {
      const chainRestAuthApi = new ChainRestAuthApi(wallet.network.rest);
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

      const directSignResponse = await this.keplr.signDirect(
        network.chainId,
        wallet.account.address,
        preparedTx.cosmosSignDoc,
      );
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

export default KeplrProvider;
