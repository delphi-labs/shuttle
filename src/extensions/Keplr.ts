import { BroadcastMode, AminoSignResponse, StdSignDoc, StdTx, OfflineSigner } from "@cosmjs/launchpad";
import { DirectSignResponse, OfflineDirectSigner } from "@cosmjs/proto-signing";
import { Bech32Config, BIP44, Network, NetworkCurrency } from "../internals";

interface ChainInfo extends Network {
  readonly rpc: string;
  readonly rest: string;
  readonly chainId: string;
  readonly chainName: string;
  /**
   * This indicates the type of coin that can be used for stake.
   * You can get actual currency information from Currencies.
   */
  readonly stakeCurrency: NetworkCurrency;
  readonly bip44: BIP44;
  readonly alternativeBIP44s?: BIP44[];
  readonly bech32Config: Bech32Config;
  readonly currencies: NetworkCurrency[];
  /**
   * This indicates which coin or token can be used for fee to send transaction.
   * You can get actual currency information from Currencies.
   */
  readonly feeCurrencies: NetworkCurrency[];
  /**
   * This is the coin type in slip-044.
   * This is used for fetching address from ENS if this field is set.
   */
  readonly coinType?: number;
  /**
   * This is used to set the fee of the transaction.
   * If this field is empty, it just use the default gas price step (low: 0.01, average: 0.025, high: 0.04).
   * And, set field's type as primitive number because it is hard to restore the prototype after deserialzing if field's type is `Dec`.
   */
  readonly gasPriceStep?: {
    low: number;
    average: number;
    high: number;
  };
  /**
   * Indicate the features supported by this chain. Ex) cosmwasm, secretwasm ...
   */
  readonly features?: string[];
}

interface Key {
  readonly name: string;
  readonly algo: string;
  readonly pubKey: Uint8Array;
  readonly address: Uint8Array;
  readonly bech32Address: string;
}

interface SecretUtils {
  getPubkey: () => Promise<Uint8Array>;
  decrypt: (ciphertext: Uint8Array, nonce: Uint8Array) => Promise<Uint8Array>;
  encrypt: (contractCodeHash: string, msg: object) => Promise<Uint8Array>;
}

interface KeplrSignOptions {
  readonly preferNoSetFee?: boolean;
  readonly preferNoSetMemo?: boolean;

  readonly disableBalanceCheck?: boolean;
}

export interface Keplr {
  readonly version: string;
  experimentalSuggestChain(chainInfo: ChainInfo): Promise<void>;
  enable(chainId: string): Promise<void>;
  getKey(chainId: string): Promise<Key>;
  signAmino(
    chainId: string,
    signer: string,
    signDoc: StdSignDoc,
    signOptions?: KeplrSignOptions,
  ): Promise<AminoSignResponse>;
  signDirect(
    chainId: string,
    signer: string,
    signDoc: {
      /** SignDoc bodyBytes */
      bodyBytes?: Uint8Array | null;
      /** SignDoc authInfoBytes */
      authInfoBytes?: Uint8Array | null;
      /** SignDoc chainId */
      chainId?: string | null;
      /** SignDoc accountNumber */
      accountNumber?: Long | null;
    },
    signOptions?: KeplrSignOptions,
  ): Promise<DirectSignResponse>;
  sendTx(chainId: string, stdTx: StdTx, mode: BroadcastMode): Promise<Uint8Array>;
  getOfflineSigner(chainId: string): OfflineSigner & OfflineDirectSigner;
  suggestToken(chainId: string, contractAddress: string): Promise<void>;
  getSecret20ViewingKey(chainId: string, contractAddress: string): Promise<string>;
  getEnigmaUtils(chainId: string): SecretUtils;
  getEnigmaPubKey(chainId: string): Promise<Uint8Array>;
  enigmaEncrypt(chainId: string, contractCodeHash: string, msg: object): Promise<Uint8Array>;
  enigmaDecrypt(chainId: string, ciphertext: Uint8Array, nonce: Uint8Array): Promise<Uint8Array>;
  experimentalSignEIP712CosmosTx_v0(
    chainId: string,
    signer: string,
    eip712: {
      types: Record<string, { name: string; type: string }[] | undefined>;
      domain: Record<string, any>;
      primaryType: string;
    },
    signDoc: StdSignDoc,
    signOptions?: KeplrSignOptions,
  ): Promise<AminoSignResponse>;
}
