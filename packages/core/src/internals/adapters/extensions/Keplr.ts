import { GasPrice } from "@cosmjs/stargate";
import { OfflineDirectSigner, OfflineSigner } from "@cosmjs/proto-signing";
import { AminoSignResponse, StdSignDoc, StdSignature } from "@cosmjs/amino";
import { toBase64 } from "@cosmjs/encoding";

import { defaultBech32Config, nonNullable } from "../../../utils";
import {
  DEFAULT_BIP44_COIN_TYPE,
  DEFAULT_CHAIN_PREFIX,
  DEFAULT_CURRENCY,
  DEFAULT_GAS_PRICE,
  type NetworkCurrency,
  type Network,
  BIP44,
  Bech32Config,
  isInjectiveNetwork,
} from "../../../internals/network";
import type { BroadcastResult, EthSignType, SigningResult } from "../../../internals/transactions";
import type { TransactionMsg } from "../../../internals/transactions/messages";
import { Algos, type Algo, type WalletConnection } from "../../../internals/wallet";
import type WalletExtensionProvider from "../../../providers/extensions/WalletExtensionProvider";
import AminoSigningClient from "../../../internals/cosmos/AminoSigningClient";
import InjectiveEIP712SigningClient from "../../injective/InjectiveEIP712SigningClient";
import OfflineDirectSigningClient from "../../../internals/cosmos/OfflineDirectSigningClient";
import { ArbitrarySigningClient, BroadcastClient } from "../../../internals/cosmos";
import SignAndBroadcastClient from "../../../internals/cosmos/SignAndBroadcastClient";
import { ExtensionProviderAdapter } from "./";

interface KeplrChainInfo extends Network {
  rpc: string;
  rest: string;
  chainId: string;
  chainName: string;
  bip44: BIP44;
  bech32Config: Bech32Config;
  stakeCurrency: NetworkCurrency;
  currencies: NetworkCurrency[];
  feeCurrencies: NetworkCurrency[];
  coinType?: number;
  gasPriceStep?: {
    low: number;
    average: number;
    high: number;
  };
  features?: string[];
}

interface KeplrKey {
  address: Uint8Array;
  algo: string;
  bech32Address: string;
  isKeystone: boolean;
  isNanoLedger: boolean;
  name: string;
  pubKey?: Uint8Array;
  pubkey?: Uint8Array;
}

export type KeplrWindow = {
  experimentalSuggestChain(chainInfo: KeplrChainInfo): Promise<void>;
  enable(chainId: string): Promise<void>;
  getKey(chainId: string): Promise<KeplrKey>;
  experimentalSignEIP712CosmosTx_v0(
    chainId: string,
    signer: string,
    eip712: {
      types: Record<string, { name: string; type: string }[] | undefined>;
      domain: Record<string, any>;
      primaryType: string;
    },
    signDoc: StdSignDoc,
    signOptions?: unknown,
  ): Promise<AminoSignResponse>;
  signAmino(chainId: string, signer: string, signDoc: StdSignDoc, signOptions?: unknown): Promise<AminoSignResponse>;
  getOfflineSigner(chainId: string): OfflineSigner & OfflineDirectSigner;
  signArbitrary(chainId: string, signer: string, data: string | Uint8Array): Promise<StdSignature>;
  verifyArbitrary(
    chainId: string,
    signer: string,
    data: string | Uint8Array,
    signature: StdSignature,
  ): Promise<boolean>;
  defaultOptions?: {
    sign?: {
      preferNoSetFee?: boolean;
      preferNoSetMemo?: boolean;
    };
  };
  signEthereum(chainId: string, signer: string, data: string | Uint8Array, type: EthSignType): Promise<Uint8Array>;
};

export class Keplr implements ExtensionProviderAdapter {
  name: string;
  useExperimentalSuggestChain: boolean;
  isAvailable: boolean = false;
  keplr?: KeplrWindow;
  extensionResolver: () => KeplrWindow | undefined;
  onInitialized: ((keplr: KeplrWindow) => void) | undefined;
  setupOnUpdateEventListener: (callback?: () => void) => void;

  constructor({
    name,
    useExperimentalSuggestChain,
    extensionResolver,
    setupOnUpdateEventListener,
    onInitialized,
  }: {
    name?: string;
    useExperimentalSuggestChain?: boolean;
    extensionResolver: () => KeplrWindow | undefined;
    setupOnUpdateEventListener: (callback?: () => void) => void;
    onInitialized?: (keplr: KeplrWindow) => void;
  }) {
    this.name = name || "Keplr";
    this.useExperimentalSuggestChain = useExperimentalSuggestChain ?? true;
    this.extensionResolver = extensionResolver;
    this.setupOnUpdateEventListener = setupOnUpdateEventListener;
    this.onInitialized = onInitialized;
  }

  async init(provider: WalletExtensionProvider): Promise<void> {
    this.keplr = this.extensionResolver?.();

    if (!this.keplr) {
      throw new Error(`${this.name} is not available`);
    }

    this.setupOnUpdateEventListener?.(() => {
      provider.onUpdate?.();
    });

    this.isAvailable = true;

    this.onInitialized?.(this.keplr);
  }

  isReady(): boolean {
    return this.isAvailable;
  }

  async connect(provider: WalletExtensionProvider, { network }: { network: Network }): Promise<WalletConnection> {
    if (!this.keplr) {
      throw new Error(`${this.name} is not available`);
    }

    if (this.useExperimentalSuggestChain && this.keplr.experimentalSuggestChain) {
      const defaultCurrency = network.defaultCurrency || DEFAULT_CURRENCY;
      const baseGasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
      await this.keplr.experimentalSuggestChain({
        name: network.name,
        chainName: network.name,
        chainId: network.chainId,
        chainPrefix: network.chainPrefix,
        rpc: network.rpc,
        rest: network.rest,
        gasPrice: network.gasPrice,
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
                    low: baseGasPrice.amount.toFloatApproximation() * 1.1,
                    average: baseGasPrice.amount.toFloatApproximation() * 1.25,
                    high: baseGasPrice.amount.toFloatApproximation() * 1.5,
                  },
                });
              })
            : []),
          Object.assign(defaultCurrency, {
            gasPriceStep: {
              low: baseGasPrice.amount.toFloatApproximation() * 1.1,
              average: baseGasPrice.amount.toFloatApproximation() * 1.25,
              high: baseGasPrice.amount.toFloatApproximation() * 1.5,
            },
          }),
        ].filter(nonNullable),
        features: network.features || [],
      });
    }

    await this.keplr.enable(network.chainId);

    const account = await this.keplr.getKey(network.chainId);

    return {
      id: `provider:${provider.id}:network:${network.chainId}:address:${account.bech32Address}`,
      providerId: provider.id,
      account: {
        address: account.bech32Address,
        pubkey: toBase64(account.pubKey || account.pubkey || new Uint8Array(0)),
        algo: account.algo as Algo,
        isLedger: account.isNanoLedger,
      },
      network,
      mobileSession: {},
    };
  }

  async disconnect(_provider: WalletExtensionProvider, _options?: { network: Network } | undefined): Promise<void> {
    return;
  }

  async sign(
    provider: WalletExtensionProvider,
    {
      network,
      wallet,
      messages,
      feeAmount,
      gasLimit,
      memo,
      overrides,
    }: {
      network: Network;
      messages: TransactionMsg<any>[];
      wallet: WalletConnection;
      feeAmount?: string | null;
      gasLimit?: string | null;
      memo?: string | null;
      overrides?: {
        rpc?: string;
        rest?: string;
        gasAdjustment?: number;
        gasPrice?: string;
        feeCurrency?: NetworkCurrency;
      };
    },
  ): Promise<SigningResult> {
    if (!this.keplr) {
      throw new Error(`${this.name} is not available`);
    }

    if (wallet.account.isLedger) {
      return await this.signLedger(provider, { network, wallet, messages, feeAmount, gasLimit, memo, overrides });
    }

    return await OfflineDirectSigningClient.sign(this.keplr.getOfflineSigner(network.chainId), {
      network,
      wallet,
      messages,
      feeAmount,
      gasLimit,
      memo,
      overrides,
    });
  }

  async signLedger(
    _provider: WalletExtensionProvider,
    {
      network,
      wallet,
      messages,
      feeAmount,
      gasLimit,
      memo,
      overrides,
    }: {
      network: Network;
      messages: TransactionMsg<any>[];
      wallet: WalletConnection;
      feeAmount?: string | null;
      gasLimit?: string | null;
      memo?: string | null;
      overrides?: {
        rpc?: string;
        rest?: string;
        gasAdjustment?: number;
        gasPrice?: string;
        feeCurrency?: NetworkCurrency;
      };
    },
  ): Promise<SigningResult> {
    if (!this.keplr) {
      throw new Error(`${this.name} is not available`);
    }

    if (isInjectiveNetwork(network.chainId)) {
      const {
        messages: preparedMessages,
        eip712TypedData,
        signDoc,
      } = await InjectiveEIP712SigningClient.prepare({
        network,
        wallet,
        messages,
        feeAmount,
        gasLimit,
        memo,
        overrides,
      });

      const signResponse = await this.keplr.experimentalSignEIP712CosmosTx_v0(
        network.chainId,
        wallet.account.address,
        eip712TypedData,
        signDoc,
      );

      return await InjectiveEIP712SigningClient.finish({
        network,
        pubKey: wallet.account.pubkey || "",
        messages: preparedMessages,
        signDoc: signResponse.signed,
        signature: Buffer.from(signResponse.signature.signature, "base64"),
      });
    }

    const signDoc = await AminoSigningClient.prepare({
      network,
      wallet,
      messages,
      feeAmount,
      gasLimit,
      memo,
      overrides,
    });

    const signResponse = await this.keplr.signAmino(network.chainId, wallet.account.address, signDoc);

    return await AminoSigningClient.finish({
      network,
      messages,
      signResponse,
    });
  }

  async signAndBroadcast(
    provider: WalletExtensionProvider,
    {
      network,
      wallet,
      messages,
      feeAmount,
      gasLimit,
      memo,
      overrides,
    }: {
      network: Network;
      messages: TransactionMsg<any>[];
      wallet: WalletConnection;
      feeAmount?: string | null;
      gasLimit?: string | null;
      memo?: string | null;
      overrides?: {
        rpc?: string;
        rest?: string;
        gasAdjustment?: number;
        gasPrice?: string;
        feeCurrency?: NetworkCurrency;
      };
    },
  ): Promise<BroadcastResult> {
    if (!this.keplr) {
      throw new Error(`${this.name} is not available`);
    }

    if (wallet.account.isLedger || isInjectiveNetwork(network.chainId)) {
      const signResult = await this.sign(provider, {
        network,
        wallet,
        messages,
        feeAmount,
        gasLimit,
        memo,
        overrides,
      });

      return await BroadcastClient.execute({ network, signResult, overrides });
    }

    return await SignAndBroadcastClient.execute(this.keplr.getOfflineSigner(network.chainId), {
      network,
      wallet,
      messages,
      feeAmount,
      gasLimit,
      memo,
      overrides,
    });
  }

  async signArbitrary(
    _provider: WalletExtensionProvider,
    {
      network,
      wallet,
      data,
    }: {
      network: Network;
      wallet: WalletConnection;
      data: Uint8Array;
    },
  ): Promise<SigningResult> {
    if (!this.keplr) {
      throw new Error(`${this.name} is not available`);
    }

    const signature = await this.keplr.signArbitrary(network.chainId, wallet.account.address, data);

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
    if (!this.keplr) {
      throw new Error(`${this.name} is not available`);
    }

    if (wallet.account.algo !== Algos.secp256k1) {
      throw new Error(`Unsupported algorithm: ${wallet.account.algo}`);
    }

    return await ArbitrarySigningClient.verifyEmptyDocSignature({
      wallet,
      data,
      signature: signResult.signatures[0],
    });
  }

  async signEthereum(
    _provider: WalletExtensionProvider,
    { chainId, signer, data, type }: { chainId: string; signer: string; data: string | Uint8Array; type: EthSignType },
  ): Promise<Uint8Array> {
    if (!this.keplr) {
      throw new Error(`${this.name} is not available`);
    }
    return await this.keplr.signEthereum(chainId, signer, data, type);
  }
}

export default Keplr;
