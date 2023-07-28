import { GasPrice } from "@cosmjs/stargate";
import { fromBase64 } from "@cosmjs/encoding";

import { DEFAULT_CURRENCY, DEFAULT_GAS_PRICE, type Network } from "../../../internals/network";
import type { SigningResult, BroadcastResult } from "../../../internals/transactions";
import type { TransactionMsg } from "../../../internals/transactions/messages";
import { Algos, type WalletConnection } from "../../../internals/wallet";
import SimulateClient from "../../../internals/cosmos/SimulateClient";
import TxWatcher from "../../../internals/transactions/TxWatcher";
import type { WalletExtensionProvider } from "../../../providers/extensions";
import { ExtensionProviderAdapter } from "./";
import { ArbitrarySigningClient } from "../../cosmos";

export type StationAccount = {
  address: string;
  addresses: {
    [key: string]: string;
  };
  ledger: boolean;
  name: string;
  network: "mainnet" | "testnet";
  pubkey: {
    118: string;
    330: string;
    [key: number]: string;
  };
};

export type StationWindow = {
  connect(): Promise<StationAccount>;
  sign(
    tx: { chainID: string; msgs: string[]; fee?: string; memo?: string },
    purgeQueue?: boolean,
  ): Promise<{
    auth_info: {
      fee: { amount: { amount: string; denom: string }[]; gas_limit: string; granter: string; payer: string };
      signer_infos: { mode_info: any; public_key: { ["@type"]: string; key: string }; sequence: string }[];
    };
    body: { memo: string; messages: any[]; timeout_height: string };
    signatures: string[];
  }>;
  post(
    tx: { chainID: string; msgs: string[]; fee?: string; memo?: string },
    purgeQueue?: boolean,
  ): Promise<{
    height: string | number;
    raw_log: string;
    txhash: string;
    code?: number | string;
    codespace?: string;
  }>;
  signBytes(bytes: string, purgeQueue?: boolean): Promise<{ public_key: string; recid: number; signature: string }>;
};

export class Station implements ExtensionProviderAdapter {
  name: string;
  extension?: StationWindow;
  isAvailable: boolean = false;
  extensionResolver: () => StationWindow | undefined;
  setupOnUpdateEventListener: (callback?: () => void) => void;

  constructor({
    name,
    extensionResolver,
    setupOnUpdateEventListener,
  }: {
    name?: string;
    extensionResolver: () => StationWindow | undefined;
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

    const isLedger = connect.ledger;

    const bech32Address = connect.addresses[network.chainId];
    if (!bech32Address) {
      throw new Error(`Wallet not connected to the network "${network.name}" with chainId "${network.chainId}"`);
    }

    const terraAddress = connect.address;
    const terraPubkey = connect.pubkey[330];

    let pubkey = connect.pubkey[118];
    if (network.chainId === "phoenix-1" || network.chainId === "pisco-1") {
      pubkey = terraPubkey;
    }

    return {
      id: `provider:${provider.id}:network:${network.chainId}:address:${bech32Address}`,
      providerId: provider.id,
      account: {
        address: bech32Address,
        pubkey,
        algo: "secp256k1",
        isLedger,
      },
      walletAccount: {
        address: terraAddress,
        algo: "secp256k1",
        pubkey: terraPubkey,
      },
      network,
      mobileSession: {},
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
      amount: [{ amount: feeAmount && feeAmount != "auto" ? feeAmount : gas, denom: feeCurrency.coinMinimalDenom }],
      gas_limit: gasLimit || gas,
    });

    const signing = await this.extension.sign({
      msgs: messages.map((message) => message.toTerraExtensionMsg()),
      fee,
      memo: memo || "",
      chainID: network.chainId,
    });

    return {
      signatures: signing.signatures.map((signature) => fromBase64(signature)),
      response: signing,
    };
  }

  async signAndBroadcast(
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
      amount: [{ amount: feeAmount && feeAmount != "auto" ? feeAmount : gas, denom: feeCurrency.coinMinimalDenom }],
      gas_limit: gasLimit || gas,
    });

    const post = await this.extension.post(
      {
        msgs: messages.map((message) => message.toTerraExtensionMsg()),
        fee,
        memo: memo || "",
        chainID: network.chainId,
      },
      true,
    );

    if (!post?.txhash) {
      throw new Error(`Broadcast failed: ${post?.code || "Unknown:"}: ${post?.codespace || "error"}`);
    }

    const tx = await TxWatcher.findTx(network.rpc, post.txhash);

    if (!tx) {
      throw new Error(`Broadcast failed: Tx not found`);
    }

    return {
      hash: tx.hash,
      rawLogs: tx.rawLog,
      response: tx,
    };
  }

  async signArbitrary(
    _provider: WalletExtensionProvider,
    {
      data,
    }: {
      network: Network;
      wallet: WalletConnection;
      data: Uint8Array;
    },
  ): Promise<SigningResult> {
    if (!this.extension) {
      throw new Error(`${this.name} is not available`);
    }

    console.log(data);
    console.log(Buffer.from(data).toString("base64"));
    console.log(Buffer.from(data).toString("utf-8"));

    const signature = await this.extension.signBytes(Buffer.from(data).toString("base64"), true);

    return {
      signatures: [Buffer.from(signature.signature, "base64")],
      response: signature,
    };
  }

  async verifyArbitrary(
    _provider: WalletExtensionProvider,
    {
      wallet,
      data,
      signResult,
    }: {
      network: Network;
      wallet: WalletConnection;
      data: Uint8Array;
      signResult: SigningResult;
    },
  ): Promise<boolean> {
    if (!this.extension) {
      throw new Error(`${this.name} is not available`);
    }

    if (wallet.walletAccount?.algo !== Algos.secp256k1) {
      throw new Error(`Unsupported algorithm: ${wallet.walletAccount?.algo}`);
    }

    return await ArbitrarySigningClient.verifyBytesSignature({
      wallet,
      data,
      signature: signResult.signatures[0],
    });
  }
}

export default Station;
