import WalletConnect from "@walletconnect/client";
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

import {
  Network,
  WalletConnection,
  MobileConnectResponse,
  TransactionMsg,
  SimulateResult,
  BroadcastResult,
  SigningResult,
  DEFAULT_GAS_MULTIPLIER,
  DEFAULT_GAS_PRICE,
  DEFAULT_CURRENCY,
  isInjectiveNetwork,
  fromInjectiveCosmosChainToEthereumChain,
  Fee,
  prepareMessagesForInjective,
} from "../internals";
import MobileWalletProvider from "./MobileWalletProvider";
import { recoverTypedSignaturePubKey } from "../providers";

export const MobileMetamaskProvider = class MobileMetamaskProvider implements MobileWalletProvider {
  id: string = "mobile-metamask";
  name: string = "Metamask - WalletConnect";
  networks: Map<string, Network>;
  initializing: boolean = false;
  initialized: boolean = false;
  onUpdate?: () => void;

  walletConnect?: WalletConnect;
  chainId?: string;
  connectCallback?: (wallet: WalletConnection) => void;

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

  async getWalletConnection({ chainId }: { chainId: string }) {
    if (!this.walletConnect || !this.walletConnect.connected) {
      throw new Error("Mobile Metamask is not available");
    }

    const network = this.networks.get(chainId);

    if (!network) {
      throw new Error(`Network with chainId "${chainId}" not found`);
    }

    if (!network.evm) {
      throw new Error(`Network with chainId "${chainId}" is not an EVM compatible network`);
    }

    const bech32Address = network.evm.deriveCosmosAddress(this.walletConnect.accounts[0]);
    const chainNumber = this.walletConnect.chainId;
    const currentChainId = network.evm.fromEthChainToCosmosChain(chainNumber);

    if (currentChainId !== network.chainId) {
      this.walletConnect?.killSession();
      throw new Error(`Invalid network: ${network.chainId} doesn't match the expected network: ${currentChainId}`);
    }

    return {
      id: `provider:${this.id}:network:${network.chainId}:address:${bech32Address}`,
      providerId: this.id,
      account: {
        address: bech32Address,
        pubkey: null,
        algo: null,
        isLedger: false, // @TODO: check if it's a ledger
      },
      network,
    };
  }

  async init(): Promise<void> {
    if (this.initializing || this.initialized) {
      return;
    }

    this.initializing = true;

    this.walletConnect = new WalletConnect({
      bridge: "https://bridge.walletconnect.org",
    });

    if (!this.walletConnect.connected) {
      await this.walletConnect.createSession();
    }

    this.walletConnect.on("connect", async (error, payload) => {
      if (error) {
        throw error;
      }

      const peerMetaName = payload.params[0].peerMeta.name;
      if (peerMetaName !== "MetaMask") {
        this.walletConnect?.killSession();
        throw new Error(
          `Invalid provider, peerMetaName: ${peerMetaName} doesn't match the expected peerMetaName: MetaMask`,
        );
      }

      const walletConnection = await this.getWalletConnection({
        chainId: this.chainId || "",
      });

      this.connectCallback?.(walletConnection);
    });

    this.walletConnect.on("session_update", (error, _payload) => {
      if (error) {
        throw error;
      }

      this.onUpdate?.();
    });

    this.walletConnect.on("disconnect", async (error) => {
      if (error) {
        throw error;
      }

      await this.disconnect();
      this.onUpdate?.();
    });

    this.initialized = true;
    this.initializing = false;
  }

  async connect({
    chainId,
    callback,
  }: {
    chainId: string;
    callback?: ((walletConnection: WalletConnection) => void) | undefined;
  }): Promise<MobileConnectResponse> {
    if (!this.walletConnect) {
      throw new Error("Mobile Metamask is not available");
    }

    const network = this.networks.get(chainId);

    if (!network) {
      throw new Error(`Network with chainId "${chainId}" not found`);
    }

    if (!network.evm) {
      throw new Error(`Network with chainId "${chainId}" is not an EVM compatible network`);
    }

    this.connectCallback = callback;
    this.chainId = chainId;

    const url = `https://metamask.app.link/wc?uri=${encodeURIComponent(this.walletConnect.uri)}`;
    return {
      walletconnectUrl: this.walletConnect.uri,
      iosUrl: url,
      androidUrl: url,
    };
  }

  async disconnect(): Promise<void> {
    if (this.walletConnect && this.walletConnect.connected) {
      try {
        this.walletConnect.killSession();
      } catch {
        /* empty */
      }
      this.walletConnect = undefined;
      this.initialized = false;
      this.initializing = false;
      await this.init();
    }
  }

  async simulate({
    messages,
    wallet,
  }: {
    messages: TransactionMsg[];
    wallet: WalletConnection;
  }): Promise<SimulateResult> {
    if (!this.walletConnect || !this.walletConnect.connected) {
      throw new Error("Mobile Metamask is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    if (!network.evm) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" is not an EVM compatible network`);
    }

    const currentWallet = await this.getWalletConnection({ chainId: network.chainId });

    if (currentWallet.account.address !== wallet.account.address) {
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
        );

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
    mobile,
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
    if (!this.walletConnect || !this.walletConnect.connected) {
      throw new Error("Mobile Metamask is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    if (!network.evm) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" is not an EVM compatible network`);
    }

    const currentWallet = await this.getWalletConnection({ chainId: network.chainId });

    if (currentWallet.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    if (isInjectiveNetwork(network.chainId)) {
      const signResult = await this.sign({ messages, wallet, feeAmount, gasLimit, memo, mobile });

      if (signResult.response) {
        const txRestApi = new TxRestApi(overrides?.rest || network.rest);

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
    mobile,
  }: {
    messages: TransactionMsg[];
    wallet: WalletConnection;
    feeAmount?: string | null;
    gasLimit?: string | null;
    memo?: string | null;
    mobile?: boolean;
  }): Promise<SigningResult> {
    if (!this.walletConnect || !this.walletConnect.connected) {
      throw new Error("Mobile Metamask is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    if (!network.evm) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" is not an EVM compatible network`);
    }

    const currentWallet = await this.getWalletConnection({ chainId: network.chainId });

    if (currentWallet.account.address !== wallet.account.address) {
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

      if (mobile) {
        window.location.href = `https://metamask.app.link/wc`;
      }

      const signature = (await this.walletConnect.sendCustomRequest({
        jsonrpc: "2.0",
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
};
