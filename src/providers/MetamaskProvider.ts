import { calculateFee, GasPrice } from "@cosmjs/stargate";
import {
  BaseAccount,
  ChainRestAuthApi,
  ChainRestTendermintApi,
  createTransaction,
  createTransactionAndCosmosSignDoc,
  createTxRawEIP712,
  createWeb3Extension,
  getEip712TypedData,
  getEthereumAddress,
  hexToBase64,
  hexToBuff,
  SIGN_AMINO,
  TxRestApi,
} from "@injectivelabs/sdk-ts";
import { BigNumberInBase, DEFAULT_BLOCK_TIMEOUT_HEIGHT } from "@injectivelabs/utils";
import { fromRpcSig, ecrecover } from "ethereumjs-util";
import { publicKeyConvert } from "secp256k1";
import { TypedDataUtils, SignTypedDataVersion } from "@metamask/eth-sig-util";

import { Ethereum } from "../extensions/Metamask";
import {
  BroadcastResult,
  DEFAULT_CURRENCY,
  DEFAULT_GAS_MULTIPLIER,
  DEFAULT_GAS_PRICE,
  Fee,
  fromInjectiveCosmosChainToEthereumChain,
  isInjectiveNetwork,
  Network,
  prepareMessagesForInjective,
  SigningResult,
  SimulateResult,
  TransactionMsg,
  WalletConnection,
} from "../internals";
import WalletProvider from "./WalletProvider";

export const recoverTypedSignaturePubKey = (data: any, signature: string): string => {
  const compressedPubKeyPrefix = Buffer.from("04", "hex");
  const message = TypedDataUtils.eip712Hash(data, SignTypedDataVersion.V4);
  const sigParams = fromRpcSig(signature);
  const publicKey = ecrecover(message, sigParams.v, sigParams.r, sigParams.s);
  const prefixedKey = Buffer.concat([compressedPubKeyPrefix, publicKey]);
  const compressedKey = Buffer.from(publicKeyConvert(prefixedKey));

  return `0x${compressedKey.toString("hex")}`;
};

declare global {
  interface Window {
    ethereum?: Ethereum;
  }
}

export class MetamaskProvider implements WalletProvider {
  id: string;
  name: string;
  networks: Map<string, Network>;
  initializing: boolean = false;
  initialized: boolean = false;

  metamask?: Ethereum;

  constructor({ id = "metamask", name = "Metamask", networks }: { id?: string; name?: string; networks: Network[] }) {
    this.id = id;
    this.name = name;
    this.networks = new Map(networks.map((network) => [network.chainId, network]));
  }

  async init(): Promise<void> {
    if (this.initializing || this.initialized) {
      return;
    }

    this.initializing = true;

    if (!window.ethereum || !window.ethereum.isMetaMask) {
      this.initializing = false;
      throw new Error("Metamask is not available");
    }

    this.metamask = window.ethereum;
    this.initialized = true;
    this.initializing = false;
  }

  async connect({ chainId }: { chainId: string }): Promise<WalletConnection> {
    if (!this.metamask) {
      throw new Error("Metamask is not available");
    }

    const network = this.networks.get(chainId);

    if (!network) {
      throw new Error(`Network with chainId "${chainId}" not found`);
    }

    if (!network.evm) {
      throw new Error(`Network with chainId "${chainId}" is not an EVM compatible network`);
    }

    const accounts = (await this.metamask.request({
      method: "eth_requestAccounts",
    })) as string[];

    const address = network.evm.deriveCosmosAddress(accounts[0]);

    return {
      id: `provider:${this.id}:network:${network.chainId}:address:${address}`,
      providerId: this.id,
      account: {
        address: address,
        pubkey: null,
        algo: null,
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
    messages: TransactionMsg<any>[];
    wallet: WalletConnection;
  }): Promise<SimulateResult> {
    if (!this.metamask) {
      throw new Error("Metamask is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    if (!network.evm) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" is not an EVM compatible network`);
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
    }

    return {
      success: false,
      error: "Not implemented",
    };
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
    if (!this.metamask) {
      throw new Error("Metamask is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    if (!network.evm) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" is not an EVM compatible network`);
    }

    const connect = await this.connect({ chainId: network.chainId });

    if (connect.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    if (isInjectiveNetwork(network.chainId)) {
      const signResult = await this.sign({ messages, wallet, feeAmount, gasLimit, memo });

      if (signResult.response) {
        const txRestApi = new TxRestApi(wallet.network.rest);

        const broadcast = await txRestApi.broadcast(signResult.response);

        if (broadcast.code !== 0) {
          throw new Error(broadcast.rawLog);
        }

        const response = await txRestApi.fetchTxPoll(broadcast.txHash, 15000);

        return {
          hash: response.txHash,
          rawLogs: response.rawLog,
          response: response,
        };
      }
    }

    return {
      hash: "",
      rawLogs: "",
      response: null,
    };
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
    if (!this.metamask) {
      throw new Error("Metamask is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    if (!network.evm) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" is not an EVM compatible network`);
    }

    const connect = await this.connect({ chainId: network.chainId });

    if (connect.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);

    if (isInjectiveNetwork(network.chainId)) {
      const chainRestAuthApi = new ChainRestAuthApi(network.rest);
      const accountDetailsResponse = await chainRestAuthApi.fetchAccount(wallet.account.address);
      const baseAccount = BaseAccount.fromRestApi(accountDetailsResponse);
      const accountDetails = baseAccount.toAccountDetails();

      const chainRestTendermintApi = new ChainRestTendermintApi(network.rest);
      const latestBlock = await chainRestTendermintApi.fetchLatestBlock();
      const latestHeight = latestBlock.header.height;
      const timeoutHeight = new BigNumberInBase(latestHeight).plus(DEFAULT_BLOCK_TIMEOUT_HEIGHT);

      let fee: Fee | undefined = undefined;
      if (feeAmount && feeAmount != "auto") {
        const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
        const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
        feeAmount = String(new BigNumberInBase(feeAmount).times(10 ** (feeCurrency.coinDecimals - 6)).toFixed(0));
        fee = {
          amount: [{ amount: feeAmount || gas, denom: gasPrice.denom }],
          gas: gasLimit || gas,
        };
      }

      const preparedMessages = prepareMessagesForInjective(messages);
      const eip712TypedData = getEip712TypedData({
        msgs: preparedMessages,
        tx: {
          accountNumber: accountDetails.accountNumber.toString(),
          sequence: accountDetails.sequence.toString(),
          chainId: network.chainId,
          timeoutHeight: timeoutHeight.toFixed(),
        },
        fee,
        ethereumChainId: fromInjectiveCosmosChainToEthereumChain(network.chainId),
      });

      const signature = (await this.metamask.request({
        method: "eth_signTypedData_v4",
        params: [getEthereumAddress(wallet.account.address), JSON.stringify(eip712TypedData)],
      })) as string;
      const signatureBuff = hexToBuff(signature);

      const publicKeyHex = recoverTypedSignaturePubKey(eip712TypedData, signature);
      const publicKeyBase64 = hexToBase64(publicKeyHex);

      const preparedTx = createTransaction({
        message: preparedMessages.map((m) => m.toDirectSign()),
        memo: memo || "",
        signMode: SIGN_AMINO,
        fee,
        pubKey: publicKeyBase64,
        sequence: baseAccount.sequence,
        timeoutHeight: timeoutHeight.toNumber(),
        accountNumber: baseAccount.accountNumber,
        chainId: network.chainId,
      });

      const web3Extension = createWeb3Extension({
        ethereumChainId: fromInjectiveCosmosChainToEthereumChain(network.chainId),
      });

      const txRawEip712 = createTxRawEIP712(preparedTx.txRaw, web3Extension);
      txRawEip712.setSignaturesList([signatureBuff]);

      return {
        signatures: txRawEip712.getSignaturesList_asU8(),
        response: txRawEip712,
      };
    }

    return {
      signatures: [],
      response: null,
    };
  }
}

export default MetamaskProvider;
