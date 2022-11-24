import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { fromBase64 } from "@cosmjs/encoding";
import { GasPrice } from "@cosmjs/stargate";
import TerraExtension from "../extensions/TerraExtension";
import WalletProvider from "./WalletProvider";
import { WalletConnection } from "../internals/wallet";
import { Network } from "../internals/network";
import { TransactionMsg, BroadcastResult, SigningResult } from "../internals/transaction";

declare global {
  interface Window {
    isTerraExtensionAvailable?: any[];
  }
}

const DEFAULT_CURRENCY = {
  coinDenom: "LUNA",
  coinMinimalDenom: "uluna",
  coinDecimals: 6,
  coinGeckoId: "terra-luna-2",
};
const DEFAULT_GAS_PRICE = `0.2${DEFAULT_CURRENCY.coinDenom}`;

export const TerraStationProvider = class TerraStationProvider implements WalletProvider {
  id: string = "terra-station";
  name: string = "Terra Station";
  networks: Map<string, Network>;
  initializing: boolean = false;
  initialized: boolean = false;
  terraExtension?: TerraExtension;

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

    this.initializing = true;

    if (!window.isTerraExtensionAvailable) {
      this.initializing = false;
      throw new Error("Terra Station is not available");
    }

    this.terraExtension = new TerraExtension("station");
    await this.terraExtension.init();
    this.initialized = true;
    this.initializing = false;
  }

  async connect(chainId: string): Promise<WalletConnection> {
    if (!this.terraExtension) {
      throw new Error("Terra Station is not available");
    }

    const network = this.networks.get(chainId);

    if (!network) {
      throw new Error(`Network with chainId "${chainId}" not found`);
    }

    const account = await this.terraExtension.connect();

    const info = await this.terraExtension.info();

    if (info.chainID !== chainId) {
      throw new Error(`Wallet not connected to the network with chainId "${chainId}"`);
    }

    const client = await CosmWasmClient.connect(network.rpc);
    const accountInfo = await client.getAccount(account.address);

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
      id: `provider:${this.id}:network:${network.chainId}:address:${account.address}`,
      providerId: this.id,
      account: {
        address: accountInfo?.address || account.address,
        pubkey: accountInfo?.pubkey?.value || "",
        algo,
      },
      network,
    };
  }

  async broadcast(
    messages: TransactionMsg[],
    wallet: WalletConnection,
    feeAmount?: string,
    gasLimit?: string,
    memo?: string,
  ): Promise<BroadcastResult> {
    return new Promise(async (resolve, reject) => {
      if (!this.terraExtension) {
        reject("Terra Station is not available");
        throw new Error("Terra Station is not available");
      }

      const network = this.networks.get(wallet.network.chainId);

      if (!network) {
        throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
      }

      const connect = await this.connect(wallet.network.chainId);

      if (connect.account.address !== wallet.account.address) {
        reject("Wallet not connected");
        throw new Error("Wallet not connected");
      }

      const processedMessages = messages.map((message) => message.toTerraExtensionMsg());

      const feeCurrency = wallet.network.feeCurrencies?.[0] || wallet.network.defaultCurrency || DEFAULT_CURRENCY;
      const gasPrice = GasPrice.fromString(wallet.network.gasPrice || DEFAULT_GAS_PRICE);
      const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
      const fee = JSON.stringify({
        amount: [{ amount: feeAmount && feeAmount != "auto" ? feeAmount : gas, denom: gasPrice.denom }],
        gas_limit: gasLimit || gas,
      });

      const post = await this.terraExtension.post(processedMessages, fee, memo);

      if (!post?.result?.txhash) {
        reject("Broadcast failed");
        throw new Error("Broadcast failed");
      }

      const client = await CosmWasmClient.connect(wallet.network.rpc);

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
        if (tries > 300) {
          // 1 minute
          clearInterval(interval);
          reject("Broadcast time out");
          throw new Error("Broadcast time out");
        }
        tries++;
      }, 200);
    });
  }

  async sign(
    messages: TransactionMsg[],
    wallet: WalletConnection,
    feeAmount?: string,
    gasLimit?: string,
    memo?: string,
  ): Promise<SigningResult> {
    if (!this.terraExtension) {
      throw new Error("Terra Station is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const connect = await this.connect(wallet.network.chainId);

    if (connect.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    const processedMessages = messages.map((message) => message.toTerraExtensionMsg());

    const feeCurrency = wallet.network.feeCurrencies?.[0] || wallet.network.defaultCurrency || DEFAULT_CURRENCY;
    const gasPrice = GasPrice.fromString(wallet.network.gasPrice || DEFAULT_GAS_PRICE);
    const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
    const fee = JSON.stringify({
      amount: [{ amount: feeAmount && feeAmount != "auto" ? feeAmount : gas, denom: gasPrice.denom }],
      gas_limit: gasLimit || gas,
    });

    const signing = await this.terraExtension.sign(processedMessages, fee, memo);

    return {
      signatures: signing?.result.signatures.map((signature) => fromBase64(signature)),
      response: signing?.result,
    };
  }
};

export default TerraStationProvider;
