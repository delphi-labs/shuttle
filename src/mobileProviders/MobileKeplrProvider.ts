import WalletConnect from "@walletconnect/client";
import { isAndroid, payloadId } from "@walletconnect/utils";
import { calculateFee } from "@cosmjs/stargate";
import { GasPrice } from "@cosmjs/launchpad";
import { AminoSignResponse, StdSignDoc } from "@cosmjs/amino";
import { CosmWasmClient, SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { AuthInfo, Fee as KeplrFee, TxBody, TxRaw } from "@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx";
import { SignMode } from "@keplr-wallet/proto-types/cosmos/tx/signing/v1beta1/signing";
import { PubKey } from "@keplr-wallet/proto-types/cosmos/crypto/secp256k1/keys";
import {
  BaseAccount,
  ChainRestAuthApi,
  createTransactionAndCosmosSignDoc,
  TxRestApi,
  TxRaw as InjTxRaw,
} from "@injectivelabs/sdk-ts";
import { BigNumberInBase } from "@injectivelabs/utils";

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
  Fee,
  prepareMessagesForInjective,
  Algo,
} from "../internals";
import MobileWalletProvider from "./MobileWalletProvider";
import FakeOfflineSigner from "../internals/cosmos/FakeOfflineSigner";

export const MobileKeplrProvider = class MobileKeplrProvider implements MobileWalletProvider {
  id: string = "mobile-keplr";
  name: string = "Keplr - WalletConnect";
  networks: Map<string, Network>;
  initializing: boolean = false;
  initialized: boolean = false;

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

  async enable({ chainId }: { chainId: string }): Promise<void> {
    if (!this.walletConnect || !this.walletConnect.connected) {
      throw new Error("Mobile Keplr is not available");
    }

    const network = this.networks.get(chainId);

    if (!network) {
      throw new Error(`Network with chainId "${chainId}" not found`);
    }

    await this.walletConnect.sendCustomRequest({
      id: payloadId(),
      jsonrpc: "2.0",
      method: "keplr_enable_wallet_connect_v1",
      params: [network.chainId],
    });
  }

  async getAccounts({ chainId }: { chainId: string }): Promise<
    {
      address: string;
      algo: string;
      bech32Address: string;
      isKeystone: boolean;
      isNanoLedger: boolean;
      name: string;
      pubKey: string;
    }[]
  > {
    if (!this.walletConnect || !this.walletConnect.connected) {
      throw new Error("Mobile Keplr is not available");
    }

    const network = this.networks.get(chainId);

    if (!network) {
      throw new Error(`Network with chainId "${chainId}" not found`);
    }

    return await this.walletConnect.sendCustomRequest({
      id: payloadId(),
      jsonrpc: "2.0",
      method: "keplr_get_key_wallet_connect_v1",
      params: [network.chainId],
    });
  }

  async getWalletConnection({ chainId }: { chainId: string }) {
    if (!this.walletConnect || !this.walletConnect.connected) {
      throw new Error("Mobile Keplr is not available");
    }

    const network = this.networks.get(chainId);

    if (!network) {
      throw new Error(`Network with chainId "${chainId}" not found`);
    }

    await this.enable({ chainId: network.chainId });

    const accounts = await this.getAccounts({ chainId: network.chainId });

    if (!accounts || accounts.length === 0) {
      this.walletConnect?.killSession();
      throw new Error(`No wallet connected to chain: ${chainId}`);
    }

    const account = accounts[0];

    return {
      id: `provider:${this.id}:network:${network.chainId}:address:${account.bech32Address}`,
      providerId: this.id,
      account: {
        address: account.bech32Address,
        pubkey: account.pubKey,
        algo: account.algo as Algo,
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
      signingMethods: [
        "keplr_enable_wallet_connect_v1",
        "keplr_get_key_wallet_connect_v1",
        "keplr_sign_amino_wallet_connect_v1",
      ],
    });

    if (!this.walletConnect.connected) {
      await this.walletConnect.createSession();
    }

    this.walletConnect.on("connect", async (error, payload) => {
      if (error) {
        throw error;
      }

      const peerMetaName = payload.params[0].peerMeta.name;
      if (peerMetaName !== "Keplr") {
        this.walletConnect?.killSession();
        throw new Error(
          `Invalid provider, peerMetaName: ${peerMetaName} doesn't match the expected peerMetaName: Keplr`,
        );
      }

      const walletConnection = await this.getWalletConnection({
        chainId: this.chainId || "",
      });

      this.connectCallback?.(walletConnection);
    });

    this.walletConnect.on("session_update", (error, payload) => {
      if (error) {
        throw error;
      }

      console.log("session_update", payload);
    });

    this.walletConnect.on("disconnect", async (error) => {
      if (error) {
        throw error;
      }

      await this.disconnect();
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
      throw new Error("Mobile Keplr is not available");
    }

    const network = this.networks.get(chainId);

    if (!network) {
      throw new Error(`Network with chainId "${chainId}" not found`);
    }

    this.connectCallback = callback;
    this.chainId = chainId;

    return {
      walletconnectUrl: this.walletConnect.uri,
      iosUrl: `keplrwallet://wcV1?${this.walletConnect.uri}`,
      androidUrl: `intent://wcV1?${this.walletConnect.uri}#Intent;package=com.chainapsis.keplr;scheme=keplrwallet;end;`,
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
    messages: TransactionMsg<any>[];
    wallet: WalletConnection;
  }): Promise<SimulateResult> {
    if (!this.walletConnect || !this.walletConnect.connected) {
      throw new Error("Mobile Keplr is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
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
      const preparedTx = await createTransactionAndCosmosSignDoc({
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
      const processedMessages = messages.map((message) => message.toCosmosMsg());

      try {
        const signer = new FakeOfflineSigner(wallet);
        const signingCosmWasmClient = await SigningCosmWasmClient.connectWithSigner(network.rpc || "", signer);

        const gasEstimation = await signingCosmWasmClient.simulate(wallet.account.address, processedMessages, "");

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
    mobile,
  }: {
    messages: TransactionMsg[];
    wallet: WalletConnection;
    feeAmount?: string | null;
    gasLimit?: string | null;
    memo?: string | null;
    mobile?: boolean;
  }): Promise<BroadcastResult> {
    if (!this.walletConnect || !this.walletConnect.connected) {
      throw new Error("Mobile Keplr is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const currentWallet = await this.getWalletConnection({ chainId: network.chainId });

    if (currentWallet.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    const signResult = await this.sign({ messages, wallet, feeAmount, gasLimit, memo, mobile });

    if (!signResult.response) {
      return {
        hash: "",
        rawLogs: "",
        response: null,
      };
    }

    if (isInjectiveNetwork(network.chainId)) {
      const txRestApi = new TxRestApi(network.rest);

      const txRaw = InjTxRaw.deserializeBinary(TxRaw.encode(signResult.response).finish());

      const broadcast = await txRestApi.broadcast(txRaw);

      if (broadcast.code !== 0) {
        throw new Error(broadcast.rawLog);
      }

      const response = await txRestApi.fetchTxPoll(broadcast.txHash, 15000);

      return {
        hash: response.txHash,
        rawLogs: response.rawLog,
        response: response,
      };
    } else {
      const client = await CosmWasmClient.connect(network.rpc);

      const broadcast = await client.broadcastTx(TxRaw.encode(signResult.response).finish(), 15000, 2500);

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
      throw new Error("Mobile Keplr is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const currentWallet = await this.getWalletConnection({ chainId: network.chainId });

    if (currentWallet.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
    const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
    const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);

    let accountNumber = "";
    let sequence = "";
    let fee: Fee = {
      amount: [{ amount: gas, denom: gasPrice.denom }],
      gas: gasLimit || gas,
    };

    if (isInjectiveNetwork(network.chainId)) {
      const chainRestAuthApi = new ChainRestAuthApi(network.rest);
      const accountDetailsResponse = await chainRestAuthApi.fetchAccount(wallet.account.address);
      const baseAccount = BaseAccount.fromRestApi(accountDetailsResponse);
      accountNumber = baseAccount.accountNumber.toString() || "";
      sequence = baseAccount.sequence.toString() || "";

      if (feeAmount && feeAmount != "auto") {
        feeAmount = String(new BigNumberInBase(feeAmount).times(10 ** (feeCurrency.coinDecimals - 6)).toFixed(0));
        fee = {
          amount: [{ amount: feeAmount || gas, denom: gasPrice.denom }],
          gas: gasLimit || gas,
        };
      }
    } else {
      const client = await CosmWasmClient.connect(network.rpc);
      const accountInfo = await client.getAccount(wallet.account.address);
      accountNumber = accountInfo?.accountNumber.toString() || "";
      sequence = accountInfo?.sequence.toString() || "";

      if (feeAmount && feeAmount != "auto") {
        fee = {
          amount: [{ amount: feeAmount || gas, denom: gasPrice.denom }],
          gas: gasLimit || gas,
        };
      }
    }

    const signDoc: StdSignDoc = {
      chain_id: network.chainId,
      account_number: accountNumber,
      sequence,
      fee,
      msgs: messages.map((message) => message.toAminoMsg()),
      memo: memo || "",
    };

    if (mobile) {
      if (isAndroid()) {
        window.location.href = "intent://wcV1#Intent;package=com.chainapsis.keplr;scheme=keplrwallet;end;";
      }

      window.location.href = "keplrwallet://wcV1";
    }

    const options: { preferNoSetFee?: boolean; preferNoSetMemo?: boolean; disableBalanceCheck?: boolean } = {
      disableBalanceCheck: true,
    };

    const signResponse = (
      await this.walletConnect.sendCustomRequest({
        jsonrpc: "2.0",
        method: "keplr_sign_amino_wallet_connect_v1",
        params: [network.chainId, wallet.account.address, signDoc, options],
      })
    )[0] as AminoSignResponse;

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

                return "/ethermint.crypto.v1.ethsecp256k1.PubKey";
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
};
