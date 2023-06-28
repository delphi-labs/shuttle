import { DirectSignResponse, OfflineDirectSigner, OfflineSigner } from "@cosmjs/proto-signing";
import { AccountData, Algo, AminoSignResponse, OfflineAminoSigner, StdSignDoc } from "@cosmjs/amino";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import {
  DEFAULT_BIP44_COIN_TYPE,
  DEFAULT_CHAIN_PREFIX,
  DEFAULT_CURRENCY,
  DEFAULT_GAS_PRICE,
  Network,
} from "../../network";
import { WalletExtensionProvider } from "../../../providers";
import { ExtensionProviderAdapter } from ".";
import { GasPrice } from "@cosmjs/stargate";
import { nonNullable } from "../../../utils";
import { toBase64 } from "@injectivelabs/sdk-ts";
import { BroadcastResult, SigningResult, TransactionMsg } from "../../transactions";
import { WalletConnection } from "../../wallet";
import OfflineDirectSigningClient from "../../cosmos/OfflineDirectSigningClient";
import { isInjectiveNetwork } from "../../injective";
import { BroadcastClient } from "../../cosmos";
import SignAndBroadcastClient from "../../cosmos/SignAndBroadcastClient";

export interface KeyInfo {
  algo: Algo;
  name: string;
  // Vectis accounts use controller pub key
  pubKey: Uint8Array;
  address: string;
  isNanoLedger: boolean;
  isVectisAccount: boolean;
}

export interface IVectisCosmosProvider {
  suggestChains(chainsInfo: ChainInfo[]): Promise<void>;
  enable(chainIds: string | string[]): Promise<void>;
  getSupportedChains(): Promise<ChainInfo[]>;
  getKey(chainId: string): Promise<KeyInfo>;
  getAccounts(chainId: string): Promise<AccountData[]>;
  signAmino(signerAddress: string, doc: StdSignDoc): Promise<AminoSignResponse>;
  signDirect(signerAddress: string, doc: SignDoc): Promise<DirectSignResponse>;
  getOfflineSignerAmino(chainId: string): OfflineAminoSigner;
  getOfflineSignerDirect(chainId: string): OfflineDirectSigner;
  getOfflineSigner(chainId: string): OfflineSigner;
  /**
   * Detect what signer should use based on the key type
   * Ex: Nano ledger only supports amino signing.
   */
  getOfflineSignerAuto(chainId: string): Promise<OfflineSigner>;
}

export interface ChainInfo {
  readonly rpcUrl: string;
  readonly restUrl: string;
  readonly chainId: string;
  readonly chainName: string;
  readonly prettyName: string;
  readonly bech32Prefix: string;
  readonly bip44: {
    readonly coinType: number;
  };
  readonly currencies: AppCurrency[];
  readonly stakeCurrency: Currency;
  readonly feeCurrencies: FeeCurrency[];
  readonly features?: string[];
  readonly isSuggested?: boolean;
  readonly ecosystem?: string;
}
export interface Currency {
  readonly coinDenom: string;
  readonly coinMinimalDenom: string;
  readonly coinDecimals: number;
  readonly coinGeckoId?: string;
  readonly coinImageUrl?: string;
}

export interface CW20Currency extends Currency {
  readonly type: "cw20";
  readonly contractAddress: string;
}

export interface IBCCurrency extends Currency {
  readonly paths: {
    portId: string;
    channelId: string;
  }[];
  readonly originChainId: string | undefined;
  readonly originCurrency: Currency | CW20Currency | undefined;
}

export type AppCurrency = Currency | CW20Currency | IBCCurrency;

export type FeeCurrency = WithGasPriceStep<AppCurrency>;

export type WithGasPriceStep<T> = T & {
  readonly gasPriceStep?: {
    readonly low: number;
    readonly average: number;
    readonly high: number;
  };
};

declare global {
  interface Window {
    vectis?: {
      version: string;
      cosmos: IVectisCosmosProvider;
    };
  }
}

export class Vectis implements ExtensionProviderAdapter {
  name: string;
  useExperimentalSuggestChain: boolean;
  isAvailable: boolean = false;
  vectis?: IVectisCosmosProvider;
  extensionResolver: () => IVectisCosmosProvider | undefined;
  setupOnUpdateEventListener: (callback?: () => void) => void;

  constructor({
    name,
    useExperimentalSuggestChain,
    extensionResolver,
    setupOnUpdateEventListener,
  }: {
    name?: string;
    useExperimentalSuggestChain?: boolean;
    extensionResolver: () => IVectisCosmosProvider | undefined;
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
}

export default Vectis;
