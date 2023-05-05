import WalletConnect from "@walletconnect/client";
import { uuid } from "@walletconnect/utils";
import { IWalletConnectOptions } from "@walletconnect/types";
import Connector from "@walletconnect/core";
import * as cryptoLib from "@walletconnect/iso-crypto";
import { CosmWasmClient, SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { calculateFee, GasPrice } from "@cosmjs/stargate";
import { fromBase64 } from "@cosmjs/encoding";

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
} from "../internals";
import MobileWalletProvider from "./MobileWalletProvider";
import FakeOfflineSigner from "../internals/cosmos/FakeOfflineSigner";
import SocketTransport from "../internals/station/websockets/SocketTransport";

const mapToChainId = (chainNumber: number) => {
  switch (chainNumber) {
    case 0:
      return "pisco-1";
    case 1:
      return "phoenix-1";
    default:
      throw new Error(`Invalid chain id: ${chainNumber}`);
  }
};

export const MobileTerraStationProvider = class MobileTerraStationProvider implements MobileWalletProvider {
  id: string = "mobile-terra-station";
  name: string = "TerraStation - WalletConnect";
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
      throw new Error("Mobile Terra Station is not available");
    }

    const network = this.networks.get(chainId);

    if (!network) {
      throw new Error(`Network with chainId "${chainId}" not found`);
    }

    const bech32Address = this.walletConnect.accounts[0];
    const chainNumber = this.walletConnect.chainId;
    const currentChainId = mapToChainId(chainNumber);
    if (currentChainId !== network.chainId) {
      this.walletConnect?.killSession();
      throw new Error(`Invalid network: ${network.chainId} doesn't match the expected network: ${currentChainId}`);
    }

    const client = await CosmWasmClient.connect(network.rpc);
    const accountInfo = await client.getAccount(bech32Address);

    let algo: "secp256k1" | "ed25519" | "sr25519" = "secp256k1";
    if (accountInfo?.pubkey?.type === "tendermint/PubKeySecp256k1" || accountInfo?.pubkey?.type.match(/secp256k1/i)) {
      algo = "secp256k1";
    } else if (
      accountInfo?.pubkey?.type === "tendermint/PubKeyEd25519" ||
      accountInfo?.pubkey?.type.match(/ed25519/i)
    ) {
      algo = "ed25519";
    } else if (
      accountInfo?.pubkey?.type === "tendermint/PubKeySr25519" ||
      accountInfo?.pubkey?.type.match(/sr25519/i)
    ) {
      algo = "sr25519";
    }

    return {
      id: `provider:${this.id}:network:${network.chainId}:address:${bech32Address}`,
      providerId: this.id,
      account: {
        address: accountInfo?.address || bech32Address,
        pubkey: accountInfo?.pubkey?.value || "",
        algo,
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

    const cachedSession = localStorage.getItem("walletconnect");

    const connectorOpts: IWalletConnectOptions = {
      bridge: "https://walletconnect.terra.dev/",
      qrcodeModal: undefined,
    };

    if (typeof cachedSession === "string") {
      const cachedSessionObject = JSON.parse(cachedSession);
      const clientId = cachedSessionObject.clientId;
      this.walletConnect = new Connector({
        connectorOpts: {
          ...connectorOpts,
          session: JSON.parse(cachedSession),
        },
        pushServerOpts: undefined,
        cryptoLib,
        transport: new SocketTransport({
          protocol: "wc",
          version: 1,
          url: connectorOpts.bridge!,
          subscriptions: [clientId],
        }),
      });
      this.walletConnect.clientId = clientId;
    } else {
      const clientId = uuid();
      this.walletConnect = new Connector({
        connectorOpts,
        pushServerOpts: undefined,
        cryptoLib,
        transport: new SocketTransport({
          protocol: "wc",
          version: 1,
          url: connectorOpts.bridge!,
          subscriptions: [clientId],
        }),
      });
      this.walletConnect.clientId = clientId;
      if (!this.walletConnect.connected) {
        await this.walletConnect.createSession();
      }
    }

    this.walletConnect.on("connect", async (error, payload) => {
      if (error) {
        throw error;
      }

      const peerMetaName = payload.params[0].peerMeta.name;
      if (peerMetaName !== "Station") {
        this.walletConnect?.killSession();
        throw new Error(
          `Invalid provider, peerMetaName: ${peerMetaName} doesn't match the expected peerMetaName: Station`,
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
      throw new Error("Mobile Terra Station is not available");
    }

    const network = this.networks.get(chainId);

    if (!network) {
      throw new Error(`Network with chainId "${chainId}" not found`);
    }

    this.connectCallback = callback;
    this.chainId = chainId;

    const query = encodeURIComponent(`action=wallet_connect&payload=${encodeURIComponent(this.walletConnect.uri)}`);
    const url = `https://terrastation.page.link/?link=https://terra.money?${query}&apn=money.terra.station&ibi=money.terra.station&isi=1548434735`;
    return {
      walletconnectUrl: url,
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
      localStorage.removeItem("walletconnect");
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
      throw new Error("Mobile Terra Station is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const currentWallet = await this.getWalletConnection({ chainId: network.chainId });

    if (currentWallet.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

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
    return await new Promise(async (resolve, reject) => {
      if (!this.walletConnect || !this.walletConnect.connected) {
        reject("Mobile TerraStation is not available");
        throw new Error("Mobile Terra Station is not available");
      }

      const network = this.networks.get(wallet.network.chainId);

      if (!network) {
        reject(`Network with chainId "${wallet.network.chainId}" not found`);
        throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
      }

      const currentWallet = await this.getWalletConnection({ chainId: network.chainId });

      if (currentWallet.account.address !== wallet.account.address) {
        reject("Wallet not connected");
        throw new Error("Wallet not connected");
      }

      const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
      const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
      const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
      const fee = JSON.stringify({
        amount: [{ amount: feeAmount && feeAmount != "auto" ? feeAmount : gas, denom: gasPrice.denom }],
        gas_limit: gasLimit || gas,
      });

      const id = Date.now();
      const serializedTxOptions = {
        msgs: messages.map((message) => message.toTerraExtensionMsg()),
        fee,
        memo,
      };

      if (mobile) {
        const payload = btoa(
          JSON.stringify({
            id,
            handshakeTopic: this.walletConnect.handshakeTopic,
            method: "post",
            params: serializedTxOptions,
          }),
        );

        window.location.href = `terrastation://walletconnect_confirm/?action=walletconnect_confirm&payload=${payload}`;
      }

      const post = (await this.walletConnect.sendCustomRequest({
        id,
        method: "post",
        params: [serializedTxOptions],
      })) as {
        height: number;
        raw_log: string;
        txhash: string;
      };

      if (!post?.txhash) {
        reject("Broadcast failed");
        throw new Error("Broadcast failed");
      }

      const client = await CosmWasmClient.connect(overrides?.rpc || network.rpc);

      let tries = 0;
      const interval = setInterval(async () => {
        const tx = await client.getTx(post?.txhash);
        if (tx) {
          clearInterval(interval);
          resolve({
            hash: tx.hash,
            rawLogs: tx.rawLog,
            response: tx,
          });
          return;
        }
        if (tries > 150) {
          // 1 minute
          clearInterval(interval);
          reject("Broadcast time out");
          throw new Error("Broadcast time out");
        }
        tries++;
      }, 400);
    });
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
      throw new Error("Mobile Terra Station is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const currentWallet = await this.getWalletConnection({ chainId: network.chainId });

    if (currentWallet.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
    const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
    const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
    const fee = JSON.stringify({
      amount: [{ amount: feeAmount && feeAmount != "auto" ? feeAmount : gas, denom: gasPrice.denom }],
      gas_limit: gasLimit || gas,
    });

    const id = Date.now();
    const serializedTxOptions = {
      msgs: messages.map((message) => message.toTerraExtensionMsg()),
      fee,
      memo,
    };
    const bytes = Buffer.from(JSON.stringify(serializedTxOptions));

    if (mobile) {
      const payload = btoa(
        JSON.stringify({
          id,
          handshakeTopic: this.walletConnect.handshakeTopic,
          method: "signBytes",
          params: bytes,
        }),
      );

      window.location.href = `terrastation://walletconnect_confirm/?action=walletconnect_confirm&payload=${payload}`;
    }

    const signing = (await this.walletConnect.sendCustomRequest({
      id,
      method: "signBytes",
      params: [bytes],
    })) as {
      id: string;
      msgs: string[];
      prugeQueue: boolean;
      result: {
        auth_info: {
          fee: { amount: { amount: string; denom: string }[]; gas_limit: string; granter: string; payer: string };
          signer_infos: { mode_info: any; public_key: { ["@type"]: string; key: string }; sequence: string }[];
        };
        body: { memo: string; messages: any[]; timeout_height: string };
        signatures: string[];
      };
      success: boolean;
    };

    return {
      signatures: signing?.result.signatures.map((signature) => fromBase64(signature)),
      response: signing?.result,
    };
  }
};
