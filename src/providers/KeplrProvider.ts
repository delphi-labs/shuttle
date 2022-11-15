import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { toBase64, toUtf8 } from "@cosmjs/encoding";
import { GasPrice } from "@cosmjs/stargate";
import { Window as KeplrWindow, Keplr } from "@keplr-wallet/types";
import WalletProvider, {
  BroadcastMessage,
  BroadcastResult,
  Fee,
  Network,
  SigningResult,
  WalletConnection,
} from "./WalletProvider";
import { defaultBech32Config, nonNullable } from "../utils";

declare global {
  interface Window extends KeplrWindow {}
}

const DEFAULT_CHAIN_PREFIX = "cosmos";
const DEFAULT_BIP44_COIN_TYPE = 118;
const DEFAULT_CURRENCY = {
  coinDenom: "ATOM",
  coinMinimalDenom: "uatom",
  coinDecimals: 6,
  coinGeckoId: "cosmos",
};
const DEFAULT_GAS_PRICE = `0.2${DEFAULT_CURRENCY.coinDenom}`;

export const KeplrProvider = class KeplrProvider implements WalletProvider {
  id: string = "keplr";
  name: string = "Keplr";
  networks: Map<string, Network>;
  initializing: boolean = false;
  initialized: boolean = false;

  keplr?: Keplr;

  constructor({ id, name, networks }: { id?: string; name?: string; networks: Network[] }) {
    if (id) {
      this.id = id;
    }
    if (name) {
      this.name = name;
    }
    this.networks = new Map(networks.map((network) => [network.chainId, network]));
  }

  async init(): Promise<void> {
    if (this.initializing || this.initialized) {
      return;
    }
    if (!window.keplr) {
      throw new Error("Keplr is not available");
    }
    if (!window.keplr.experimentalSuggestChain) {
      throw new Error("Keplr does not support chain suggestion");
    }

    this.initializing = true;
    this.keplr = window.keplr;
    this.initialized = true;
    this.initializing = false;
  }

  async connect(chainId: string): Promise<WalletConnection> {
    if (!this.keplr) {
      throw new Error("Keplr is not available");
    }

    const network = this.networks.get(chainId);

    if (!network) {
      throw new Error(`Network with chainId "${chainId}" not found`);
    }

    const defaultCurrency = network.defaultCurrency || DEFAULT_CURRENCY;
    const baseGasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
    await this.keplr.experimentalSuggestChain({
      ...network,
      chainName: network.name,
      rpc: network.rpc,
      rest: network.rest,
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
    });

    await this.keplr.enable(chainId);

    const offlineSigner = this.keplr.getOfflineSigner(chainId);

    const accounts = await offlineSigner.getAccounts();

    return {
      id: `provider:${this.id}:network:${network.chainId}:address:${accounts[0].address}`,
      providerId: this.id,
      account: {
        address: accounts[0].address,
        pubkey: toBase64(accounts[0].pubkey),
        algo: accounts[0].algo,
      },
      network,
    };
  }

  async broadcast(
    messages: BroadcastMessage[],
    wallet: WalletConnection,
    feeAmount?: string,
    gasLimit?: string,
    memo?: string,
  ): Promise<BroadcastResult> {
    if (!this.keplr) {
      throw new Error("Keplr is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const connect = await this.connect(wallet.network.chainId);

    if (connect.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    const offlineSigner = this.keplr.getOfflineSigner(wallet.network.chainId);

    const gasPrice = GasPrice.fromString(wallet.network.gasPrice || DEFAULT_GAS_PRICE);
    const client = await SigningCosmWasmClient.connectWithSigner(wallet.network.rpc, offlineSigner, { gasPrice });

    const processedMessages = messages.map((message) => {
      return {
        typeUrl: message.type,
        value: {
          sender: message.sender,
          contract: message.contract,
          msg: toUtf8(JSON.stringify(message.msg)),
        },
      };
    });

    let fee: "auto" | Fee = "auto";
    if (feeAmount && feeAmount != "auto") {
      const feeCurrency = wallet.network.feeCurrencies?.[0] || wallet.network.defaultCurrency || DEFAULT_CURRENCY;
      const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
      fee = {
        amount: [{ amount: feeAmount || gas, denom: gasPrice.denom }],
        gas: gasLimit || gas,
      };
    }

    const broadcast = await client.signAndBroadcast(wallet.account.address, processedMessages, fee, memo);

    return {
      hash: broadcast.transactionHash,
      rawLogs: broadcast.rawLog || "",
      response: broadcast,
    };
  }

  async sign(
    messages: BroadcastMessage[],
    wallet: WalletConnection,
    feeAmount?: string,
    gasLimit?: string,
    memo?: string,
  ): Promise<SigningResult> {
    if (!this.keplr) {
      throw new Error("Keplr is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const connect = await this.connect(wallet.network.chainId);

    if (connect.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    const offlineSigner = this.keplr.getOfflineSigner(wallet.network.chainId);

    const gasPrice = GasPrice.fromString(wallet.network.gasPrice || DEFAULT_GAS_PRICE);
    const client = await SigningCosmWasmClient.connectWithSigner(wallet.network.rpc, offlineSigner, { gasPrice });

    const processedMessages = messages.map((message) => {
      return {
        typeUrl: message.type,
        value: {
          sender: message.sender,
          contract: message.contract,
          msg: toUtf8(JSON.stringify(message.msg)),
        },
      };
    });

    const feeCurrency = wallet.network.feeCurrencies?.[0] || wallet.network.defaultCurrency || DEFAULT_CURRENCY;
    const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
    const fee = {
      amount: [{ amount: feeAmount || gas, denom: gasPrice.denom }],
      gas: gasLimit || gas,
    };
    const signing = await client.sign(wallet.account.address, processedMessages, fee, memo || "");

    return {
      signatures: signing.signatures,
      response: signing,
    };
  }
};

export default KeplrProvider;
