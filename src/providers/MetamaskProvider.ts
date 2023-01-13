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
  MsgExecuteContractCompat as InjMsgExecuteContractCompat,
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
  MsgExecuteContract,
  Network,
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

  async connect(chainId: string): Promise<WalletConnection> {
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

    // const chain = await this.metamask.request({ method: 'eth_chainId' });
    // console.log("chain", chain)

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

  async simulate(messages: TransactionMsg<any>[], wallet: WalletConnection): Promise<SimulateResult> {
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

    if (isInjectiveNetwork(network.chainId)) {
      const chainRestAuthApi = new ChainRestAuthApi(network.rest);
      const accountDetailsResponse = await chainRestAuthApi.fetchAccount(wallet.account.address);
      const baseAccount = BaseAccount.fromRestApi(accountDetailsResponse);

      const preparedMessages = messages.map((msg) => {
        const execMsg = msg as MsgExecuteContract;

        return InjMsgExecuteContractCompat.fromJSON({
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
          network.gasPrice || "0.0004inj",
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

  async broadcast(
    messages: TransactionMsg[],
    wallet: WalletConnection,
    feeAmount?: string,
    gasLimit?: string,
    memo?: string,
  ): Promise<BroadcastResult> {
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

      const preparedMessages = messages.map((msg) => {
        const execMsg = msg as MsgExecuteContract;

        return InjMsgExecuteContractCompat.fromJSON({
          sender: execMsg.value.sender,
          contractAddress: execMsg.value.contract,
          msg: execMsg.value.msg,
          funds: execMsg.value.funds,
        });
      });

      let fee: Fee | undefined = undefined;
      if (feeAmount && feeAmount != "auto") {
        const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
        const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
        fee = {
          amount: [{ amount: feeAmount || gas, denom: gasPrice.denom }],
          gas: gasLimit || gas,
        };
      }

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
        memo: memo,
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

      const txRestApi = new TxRestApi(wallet.network.rest);

      const broadcast = await txRestApi.broadcast(txRawEip712);
      console.log("broadcast", broadcast);
      const response = await txRestApi.fetchTxPoll(broadcast.txHash);
      console.log("response", response);

      return {
        hash: broadcast.txHash,
        rawLogs: broadcast.rawLog || "",
        response: broadcast,
      };
    }

    return {
      hash: "",
      rawLogs: "",
      response: null,
    };
  }

  sign(): Promise<SigningResult> {
    throw new Error("Method not implemented.");
  }
}

export default MetamaskProvider;
