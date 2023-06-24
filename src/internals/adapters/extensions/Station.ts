import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { GasPrice } from "@cosmjs/stargate";
import { fromBase64 } from "@cosmjs/encoding";

import { DEFAULT_CURRENCY, DEFAULT_GAS_PRICE, type Network } from "../../../internals/network";
import type { SigningResult, BroadcastResult } from "../../../internals/transactions";
import type { TransactionMsg } from "../../../internals/transactions/messages";
import type { WalletConnection } from "../../../internals/wallet";
import type { WalletExtensionProvider } from "../../../providers/extensions";
import SimulateClient from "../../../internals/cosmos/SimulateClient";
import { ExtensionProviderAdapter } from "./";

declare global {
  interface Window {
    isStationExtensionAvailable: boolean;
  }
}

export class Station implements ExtensionProviderAdapter {
  name: string;
  extension?: StationExtension;
  isAvailable: boolean = false;
  extensionResolver: () => StationExtension;
  setupOnUpdateEventListener: (callback?: () => void) => void;

  constructor({
    name,
    extensionResolver,
    setupOnUpdateEventListener,
  }: {
    name?: string;
    extensionResolver: () => StationExtension;
    setupOnUpdateEventListener: (callback?: () => void) => void;
  }) {
    this.name = name || "Station";
    this.extensionResolver = extensionResolver;
    this.setupOnUpdateEventListener = setupOnUpdateEventListener;
  }

  async init(provider: WalletExtensionProvider): Promise<void> {
    this.extension = this.extensionResolver();

    if (!this.extension) {
      throw new Error(`${this.name} is not available`);
    }

    await this.extension.init();

    this.setupOnUpdateEventListener?.(() => {
      provider.onUpdate?.();
    });

    this.isAvailable = true;
  }

  isReady(): boolean {
    return this.isAvailable;
  }

  async connect(provider: WalletExtensionProvider, { network }: { network: Network }): Promise<WalletConnection> {
    if (!this.extension) {
      throw new Error(`${this.name} is not available`);
    }

    const connect = await this.extension.connect();

    const bech32Address = connect.addresses[network.chainId];

    if (!bech32Address) {
      throw new Error(`Wallet not connected to the network "${network.name}" with chainId "${network.chainId}"`);
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
      id: `provider:${provider.id}:network:${network.chainId}:address:${bech32Address}`,
      providerId: provider.id,
      account: {
        address: accountInfo?.address || bech32Address,
        pubkey: accountInfo?.pubkey?.value || "",
        algo,
        isLedger: false,
      },
      network,
    };
  }

  async disconnect(_provider: WalletExtensionProvider, _options?: { network: Network } | undefined): Promise<void> {
    return;
  }

  async sign(
    _provider: WalletExtensionProvider,
    {
      network,
      wallet,
      messages,
      feeAmount,
      gasLimit,
      memo,
    }: {
      network: Network;
      messages: TransactionMsg<any>[];
      wallet: WalletConnection;
      feeAmount?: string | null | undefined;
      gasLimit?: string | null | undefined;
      memo?: string | null | undefined;
      overrides?: { rpc?: string | undefined; rest?: string | undefined } | undefined;
    },
  ): Promise<SigningResult> {
    if (!this.extension) {
      throw new Error(`${this.name} is not available`);
    }

    if (feeAmount === "auto") {
      try {
        const simulate = await SimulateClient.run({
          network,
          wallet,
          messages,
        });

        if (simulate.success) {
          feeAmount = simulate.fee?.amount[0].amount;
          gasLimit = simulate.fee?.gas;
        }
      } catch (error: any) {
        /* empty */
      }
    }

    const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
    const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
    const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
    const fee = JSON.stringify({
      amount: [{ amount: feeAmount && feeAmount != "auto" ? feeAmount : gas, denom: gasPrice.denom }],
      gas_limit: gasLimit || gas,
    });

    const signing = await this.extension.sign({
      messages: messages.map((message) => message.toTerraExtensionMsg()),
      fee,
      memo: memo || "",
      chainId: network.chainId,
    });

    return {
      signatures: signing?.result.signatures.map((signature) => fromBase64(signature)),
      response: signing?.result,
    };
  }

  signAndBroadcast(
    _provider: WalletExtensionProvider,
    {
      network,
      wallet,
      messages,
      feeAmount,
      gasLimit,
      memo,
    }: {
      network: Network;
      messages: TransactionMsg<any>[];
      wallet: WalletConnection;
      feeAmount?: string | null | undefined;
      gasLimit?: string | null | undefined;
      memo?: string | null | undefined;
      overrides?: { rpc?: string | undefined; rest?: string | undefined } | undefined;
    },
  ): Promise<BroadcastResult> {
    return new Promise(async (resolve, reject) => {
      if (!this.extension) {
        throw new Error(`${this.name} is not available`);
      }

      if (feeAmount === "auto") {
        try {
          const simulate = await SimulateClient.run({
            network,
            wallet,
            messages,
          });

          if (simulate.success) {
            feeAmount = simulate.fee?.amount[0].amount;
            gasLimit = simulate.fee?.gas;
          }
        } catch (error: any) {
          /* empty */
        }
      }

      const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
      const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
      const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
      const fee = JSON.stringify({
        amount: [{ amount: feeAmount && feeAmount != "auto" ? feeAmount : gas, denom: gasPrice.denom }],
        gas_limit: gasLimit || gas,
      });

      const post = await this.extension.post({
        messages: messages.map((message) => message.toTerraExtensionMsg()),
        fee,
        memo: memo || "",
        chainId: network.chainId,
      });

      if (!post?.result?.txhash) {
        reject("Broadcast failed");
        throw new Error("Broadcast failed");
      }

      const client = await CosmWasmClient.connect(network.rpc);

      let tries = 0;
      const interval = setInterval(async () => {
        const tx = await client.getTx(post?.result?.txhash);
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
}

export default Station;

export class StationExtension {
  identifier: string = "station";

  constructor(identifier?: string) {
    if (identifier) {
      this.identifier = identifier;
    }
  }

  public init(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const onMessage = (event: any) => {
          const message = event?.data;
          if (event.origin !== location.origin) return;
          if (event.source !== window) return;
          if (typeof message !== "object") return;
          if (message.target !== `${this.identifier}:inpage`) return;
          if (!message.data) return;

          if (message.data === "ACK") {
            window.postMessage({ target: `${this.identifier}:content`, data: "ACK" }, location.origin);
            resolve();
          }
        };
        window.addEventListener("message", onMessage);
        window.postMessage({ target: `${this.identifier}:content`, data: "SYN" }, location.origin);
      } catch (error) {
        reject(error);
      }
    });
  }

  public async interchainInfo(): Promise<{
    [key: string]: {
      baseAsset: string;
      chainID: string;
      coinType: string;
      gasAdjustment: number;
      gasPrices: { [key: string]: number };
      ibc: { fromTerra: string; toTerra: string };
      icon: string;
      lcd: string;
      name: string;
      prefix: string;
      version: string;
    };
  }> {
    return this.request("interchain-info");
  }

  public async info(): Promise<{
    api: string;
    chainID: string;
    hive: string;
    lcd: string;
    name: string;
    walletconnectID: string;
  }> {
    return this.request("info");
  }

  public async connect(): Promise<{
    address: string;
    addresses: { [key: string]: string };
    pubkey: { [coinType: number]: string };
  }> {
    return this.request("connect");
  }

  public async post({
    messages,
    fee,
    memo,
    chainId,
  }: {
    messages: any[];
    fee?: string;
    memo?: string;
    chainId?: string;
  }): Promise<{
    id: string;
    msgs: string[];
    purgeQueue: boolean;
    result: { height: number; raw_log: string; txhash: string };
    success: boolean;
  }> {
    return this.request("post", {
      msgs: messages,
      purgeQueue: true,
      waitForConfirmation: true,
      memo,
      fee,
      chainID: chainId,
    });
  }

  public async sign({
    messages,
    fee,
    memo,
    chainId,
  }: {
    messages: any[];
    fee?: string;
    memo?: string;
    chainId?: string;
  }): Promise<{
    id: string;
    msgs: string[];
    purgeQueue: boolean;
    result: {
      auth_info: {
        fee: { amount: { amount: string; denom: string }[]; gas_limit: string; granter: string; payer: string };
        signer_infos: { mode_info: any; public_key: { ["@type"]: string; key: string }; sequence: string }[];
      };
      body: { memo: string; messages: any[]; timeout_height: string };
      signatures: string[];
    };
    success: boolean;
  }> {
    return this.request("sign", { msgs: messages, purgeQueue: true, memo, fee, chainID: chainId });
  }

  private request(type: string, data: any = {}, options: { timeout?: number } = { timeout: 30 }): Promise<any> {
    return new Promise((resolve, reject) => {
      let promiseData: any = null;
      const onMessage = (event: any) => {
        const mapTypeToListener: { [key: string]: string } = {
          "interchain-info": "onInterchainInfo",
          info: "onInfo",
          connect: "onConnect",
          post: "onPost",
          sign: "onSign",
        };
        const message = event?.data;
        if (event.origin !== location.origin) return;
        if (event.source !== window) return;
        if (typeof message !== "object") return;
        if (message.target !== `${this.identifier}:inpage`) return;
        if (!message.data) return;

        if (message.data.name === mapTypeToListener[type]) {
          promiseData = message.data.payload;
        }
      };
      window.addEventListener("message", onMessage);
      const id = new Date().getTime();
      window.postMessage({ target: `${this.identifier}:content`, data: { id, type, ...data } }, location.origin);
      let tries = 0;
      const interval = setInterval(() => {
        if (tries > ((options.timeout || 15) * 1000) / 200) {
          reject("Timeout reached");
          clearInterval(interval);
          return;
        }
        if (promiseData) {
          resolve(promiseData);
          window.removeEventListener("message", onMessage);
          clearInterval(interval);
        }
        tries++;
      }, 200);
    });
  }
}
