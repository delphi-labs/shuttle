import { DirectSignResponse, OfflineDirectSigner, OfflineSigner } from "@cosmjs/proto-signing";
import { Algo, AminoSignResponse, OfflineAminoSigner, StdSignDoc } from "@cosmjs/amino";
import { GasPrice } from "@cosmjs/stargate";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { toBase64 } from "@injectivelabs/sdk-ts";

import { WalletExtensionProvider } from "../../../providers";
import { nonNullable } from "../../../utils";
import {
  BIP44,
  DEFAULT_BIP44_COIN_TYPE,
  DEFAULT_CHAIN_PREFIX,
  DEFAULT_CURRENCY,
  DEFAULT_GAS_PRICE,
  Network,
  NetworkCurrency,
} from "../../../internals/network";
import { WalletConnection } from "../../../internals/wallet";
import { BroadcastResult, SigningResult, TransactionMsg } from "../../../internals/transactions";
import OfflineDirectSigningClient from "../../../internals/cosmos/OfflineDirectSigningClient";
import { BroadcastClient } from "../../../internals/cosmos";
import SignAndBroadcastClient from "../../../internals/cosmos/SignAndBroadcastClient";
import { isInjectiveNetwork } from "../../../internals/injective";
import { ExtensionProviderAdapter } from "./";

interface VectisChainInfo extends Network {
  rpcUrl: string;
  restUrl: string;
  chainId: string;
  chainName: string;
  prettyName: string;
  bech32Prefix: string;
  bip44: BIP44;
  currencies: NetworkCurrency[];
  stakeCurrency: NetworkCurrency;
  feeCurrencies: NetworkCurrency[];
  features?: string[];
  isSuggested?: boolean;
  ecosystem?: string;
}

interface VectisKey {
  algo: Algo;
  name: string;
  pubKey: Uint8Array;
  address: string;
  isNanoLedger: boolean;
  isVectisAccount: boolean;
}

export type VectisWindowCosmosProvider = {
  suggestChains(chainsInfo: VectisChainInfo[]): Promise<void>;
  enable(chainIds: string | string[]): Promise<void>;
  getKey(chainId: string): Promise<VectisKey>;
  signAmino(signerAddress: string, doc: StdSignDoc): Promise<AminoSignResponse>;
  signDirect(signerAddress: string, doc: SignDoc): Promise<DirectSignResponse>;
  getOfflineSignerAmino(chainId: string): OfflineAminoSigner;
  getOfflineSignerDirect(chainId: string): OfflineDirectSigner;
  getOfflineSigner(chainId: string): OfflineSigner;
};

export type VectisWindow = {
  version: string;
  cosmos: VectisWindowCosmosProvider;
};

export class Vectis implements ExtensionProviderAdapter {
  name: string;
  useExperimentalSuggestChain: boolean;
  isAvailable: boolean = false;
  vectis?: VectisWindowCosmosProvider;
  extensionResolver: () => VectisWindowCosmosProvider | undefined;
  setupOnUpdateEventListener: (callback?: () => void) => void;

  constructor({
    name,
    useExperimentalSuggestChain,
    extensionResolver,
    setupOnUpdateEventListener,
  }: {
    name?: string;
    useExperimentalSuggestChain?: boolean;
    extensionResolver: () => VectisWindowCosmosProvider | undefined;
    setupOnUpdateEventListener: (callback?: () => void) => void;
  }) {
    this.name = name || "Vectis";
    this.useExperimentalSuggestChain = useExperimentalSuggestChain ?? true;
    this.extensionResolver = extensionResolver;
    this.setupOnUpdateEventListener = setupOnUpdateEventListener;
  }

  async init(provider: WalletExtensionProvider): Promise<void> {
    this.vectis = this.extensionResolver?.();

    if (!this.vectis) {
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
    if (!this.vectis) {
      throw new Error(`${this.name} is not available`);
    }

    if (this.useExperimentalSuggestChain && this.vectis.suggestChains) {
      const defaultCurrency = network.defaultCurrency || DEFAULT_CURRENCY;
      const baseGasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);

      await this.vectis.suggestChains([
        {
          ...network,
          prettyName: network.name,
          chainName: network.name.toLowerCase().replace(" ", ""),
          rpcUrl: network.rpc,
          restUrl: network.rest,
          bip44: {
            coinType: network.bip44?.coinType || DEFAULT_BIP44_COIN_TYPE,
          },
          bech32Prefix: network.bech32Config?.bech32PrefixAccAddr || network.chainPrefix || DEFAULT_CHAIN_PREFIX,
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
        },
      ]);
    }

    await this.vectis.enable(network.chainId);

    const account = await this.vectis.getKey(network.chainId);

    return {
      id: `provider:${provider.id}:network:${network.chainId}:address:${account.address}`,
      providerId: provider.id,
      account: {
        address: account.address,
        pubkey: toBase64(account.pubKey),
        algo: account.algo,
        isLedger: account.isNanoLedger,
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
      overrides,
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
    if (!this.vectis) {
      throw new Error(`${this.name} is not available`);
    }

    return await OfflineDirectSigningClient.sign(this.vectis.getOfflineSigner(network.chainId) as OfflineDirectSigner, {
      network,
      wallet,
      messages,
      feeAmount,
      gasLimit,
      memo,
      overrides,
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
      feeAmount?: string | null | undefined;
      gasLimit?: string | null | undefined;
      memo?: string | null | undefined;
      overrides?: { rpc?: string | undefined; rest?: string | undefined } | undefined;
    },
  ): Promise<BroadcastResult> {
    if (!this.vectis) {
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

    return await SignAndBroadcastClient.execute(this.vectis.getOfflineSigner(network.chainId) as OfflineDirectSigner, {
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
    _options: {
      network: Network;
      wallet: WalletConnection;
      data: Uint8Array;
    },
  ): Promise<SigningResult> {
    throw new Error("Method not supported.");
  }

  async verifyArbitrary(
    _provider: WalletExtensionProvider,
    _options: {
      network: Network;
      wallet: WalletConnection;
      data: Uint8Array;
      signResult: SigningResult;
    },
  ): Promise<boolean> {
    throw new Error("Method not supported.");
  }
}

export default Vectis;
