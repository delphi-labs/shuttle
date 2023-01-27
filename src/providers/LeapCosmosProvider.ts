import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { toBase64 } from "@cosmjs/encoding";
import { calculateFee, GasPrice } from "@cosmjs/stargate";
import { Keplr } from "../extensions";
import { defaultBech32Config, nonNullable } from "../utils";
import WalletProvider from "./WalletProvider";
import { WalletConnection } from "../internals/wallet";
import {
  DEFAULT_BIP44_COIN_TYPE,
  DEFAULT_CHAIN_PREFIX,
  DEFAULT_CURRENCY,
  DEFAULT_GAS_MULTIPLIER,
  DEFAULT_GAS_PRICE,
  isInjectiveNetwork,
  Network,
} from "../internals/network";
import {
  TransactionMsg,
  BroadcastResult,
  Fee,
  SigningResult,
  SimulateResult,
  MsgExecuteContract,
} from "../internals/transaction";
import {
  BaseAccount,
  ChainRestAuthApi,
  createTransactionAndCosmosSignDoc,
  createTxRawFromSigResponse,
  MsgExecuteContract as InjMsgExecuteContract,
  TxRestApi,
} from "@injectivelabs/sdk-ts";

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

    await this.leap.enable(chainId);

    const offlineSigner = this.leap.getOfflineSigner(chainId);

    const accounts = await offlineSigner.getAccounts();

    return {
      id: `provider:${this.id}:network:${network.chainId}:address:${accounts[0].address}`,
      providerId: this.id,
      account: {
        address: accounts[0].address,
        pubkey: toBase64(accounts[0].pubkey),
        algo: accounts[0].algo,
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

      const preparedMessages = messages.map((msg) => {
        const execMsg = msg as MsgExecuteContract;

        return InjMsgExecuteContract.fromJSON({
          sender: execMsg.value.sender,
          contractAddress: execMsg.value.contract,
          msg: execMsg.value.msg,
          funds: execMsg.value.funds,
        });
      });

      const preparedTx = await createTransactionAndCosmosSignDoc({
        pubKey: wallet.account.pubkey || "",
        chainId: wallet.network.chainId,
        message: preparedMessages.map((msg) => msg.toDirectSign()),
        sequence: baseAccount.sequence,
        accountNumber: baseAccount.accountNumber,
      });

      const txRestApi = new TxRestApi(wallet.network.rest);
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

    const connect = await this.connect({ chainId: wallet.network.chainId });

    if (connect.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    const offlineSigner = this.leap.getOfflineSigner(wallet.network.chainId);
    const gasPrice = GasPrice.fromString(wallet.network.gasPrice || DEFAULT_GAS_PRICE);
    const client = await SigningCosmWasmClient.connectWithSigner(wallet.network.rpc, offlineSigner, { gasPrice });

    if (isInjectiveNetwork(network.chainId)) {
      const chainRestAuthApi = new ChainRestAuthApi(wallet.network.rest);
      const accountDetailsResponse = await chainRestAuthApi.fetchAccount(wallet.account.address);
      const baseAccount = BaseAccount.fromRestApi(accountDetailsResponse);

      const preparedMessages = messages.map((msg) => {
        const execMsg = msg as MsgExecuteContract;

        return InjMsgExecuteContract.fromJSON({
          sender: execMsg.value.sender,
          contractAddress: execMsg.value.contract,
          msg: execMsg.value.msg,
          funds: execMsg.value.funds,
        });
      });

      let fee: Fee | undefined = undefined;
      if (feeAmount && feeAmount != "auto") {
        const feeCurrency = wallet.network.feeCurrencies?.[0] || wallet.network.defaultCurrency || DEFAULT_CURRENCY;
        const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
        fee = {
          amount: [{ amount: feeAmount || gas, denom: gasPrice.denom }],
          gas: gasLimit || gas,
        };
      }

      const preparedTx = await createTransactionAndCosmosSignDoc({
        pubKey: wallet.account.pubkey || "",
        chainId: wallet.network.chainId,
        fee,
        message: preparedMessages.map((msg) => msg.toDirectSign()),
        sequence: baseAccount.sequence,
        accountNumber: baseAccount.accountNumber,
      });

      const directSignResponse = await offlineSigner.signDirect(wallet.account.address, preparedTx.cosmosSignDoc);
      const txRaw = createTxRawFromSigResponse(directSignResponse);
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
        const feeCurrency = wallet.network.feeCurrencies?.[0] || wallet.network.defaultCurrency || DEFAULT_CURRENCY;
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

    const connect = await this.connect({ chainId: wallet.network.chainId });

    if (connect.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    const offlineSigner = this.leap.getOfflineSigner(wallet.network.chainId);

    const gasPrice = GasPrice.fromString(wallet.network.gasPrice || DEFAULT_GAS_PRICE);
    const client = await SigningCosmWasmClient.connectWithSigner(wallet.network.rpc, offlineSigner, { gasPrice });

    if (isInjectiveNetwork(network.chainId)) {
      const chainRestAuthApi = new ChainRestAuthApi(wallet.network.rest);
      const accountDetailsResponse = await chainRestAuthApi.fetchAccount(wallet.account.address);
      const baseAccount = BaseAccount.fromRestApi(accountDetailsResponse);

      const preparedMessages = messages.map((msg) => {
        const execMsg = msg as MsgExecuteContract;

        return InjMsgExecuteContract.fromJSON({
          sender: execMsg.value.sender,
          contractAddress: execMsg.value.contract,
          msg: execMsg.value.msg,
          funds: execMsg.value.funds,
        });
      });

      let fee: Fee | undefined = undefined;
      if (feeAmount && feeAmount != "auto") {
        const feeCurrency = wallet.network.feeCurrencies?.[0] || wallet.network.defaultCurrency || DEFAULT_CURRENCY;
        const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
        fee = {
          amount: [{ amount: feeAmount || gas, denom: gasPrice.denom }],
          gas: gasLimit || gas,
        };
      }

      const preparedTx = await createTransactionAndCosmosSignDoc({
        pubKey: wallet.account.pubkey || "",
        chainId: wallet.network.chainId,
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

      const feeCurrency = wallet.network.feeCurrencies?.[0] || wallet.network.defaultCurrency || DEFAULT_CURRENCY;
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
