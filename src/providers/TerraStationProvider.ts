import { CosmWasmClient, SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { fromBase64 } from "@cosmjs/encoding";
import { GeneratedType, Registry } from "@cosmjs/proto-signing";
import { calculateFee, GasPrice, defaultRegistryTypes } from "@cosmjs/stargate";
import StationExtension from "../extensions/StationExtension";
import WalletProvider from "./WalletProvider";
import { WalletConnection } from "../internals/wallet";
import { DEFAULT_GAS_MULTIPLIER, DEFAULT_GAS_PRICE, Network } from "../internals/network";
import { TransactionMsg, BroadcastResult, SigningResult, SimulateResult } from "../internals/transaction";
import FakeOfflineSigner from "../internals/cosmos/FakeOfflineSigner";

declare global {
  interface Window {
    isStationExtensionAvailable: boolean;
  }
}

const DEFAULT_CURRENCY = {
  coinDenom: "LUNA",
  coinMinimalDenom: "uluna",
  coinDecimals: 6,
  coinGeckoId: "terra-luna-2",
};

export const TerraStationProvider = class TerraStationProvider implements WalletProvider {
  id: string = "terra-station";
  name: string = "Terra Station";
  networks: Map<string, Network>;
  registry: Registry = new Registry(defaultRegistryTypes);
  initializing: boolean = false;
  initialized: boolean = false;
  onUpdate?: () => void;

  stationExtension?: StationExtension;

  constructor({
    id,
    name,
    networks,
    customMsgs,
  }: {
    id?: string;
    name?: string;
    networks: Network[];
    customMsgs?: { [key: string]: GeneratedType };
  }) {
    if (id) {
      this.id = id;
    }
    if (name) {
      this.name = name;
    }
    if (customMsgs) {
      for (let key of Object.keys(customMsgs)) {
        this.registry.register(key, customMsgs[key]);
      }
    }
    this.networks = new Map(networks.map((network) => [network.chainId, network]));
  }

  setOnUpdateCallback(callback: () => void): void {
    this.onUpdate = callback;
  }

  async init(): Promise<void> {
    if (this.initializing || this.initialized) {
      return;
    }

    this.initializing = true;

    if (!window.isStationExtensionAvailable) {
      this.initializing = false;
      throw new Error("Terra Station is not available");
    }

    this.stationExtension = new StationExtension("station");
    await this.stationExtension.init();

    window.addEventListener("station_wallet_change", () => {
      this.onUpdate?.();
    });

    window.addEventListener("station_network_change", () => {
      this.onUpdate?.();
    });

    this.initialized = true;
    this.initializing = false;
  }

  async connect({ chainId }: { chainId: string }): Promise<WalletConnection> {
    if (!this.stationExtension) {
      throw new Error("Terra Station is not available");
    }

    const network = this.networks.get(chainId);

    if (!network) {
      throw new Error(`Network with chainId "${chainId}" not found`);
    }

    const connect = await this.stationExtension.connect();

    const bech32Address = connect.addresses[network.chainId];

    if (!bech32Address) {
      throw new Error(`Wallet not connected to the network with chainId "${chainId}"`);
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
        isLedger: false,
      },
      network,
    };
  }

  async disconnect(): Promise<void> {
    return;
  }

  async simulate({
    messages,
    wallet,
  }: {
    messages: TransactionMsg[];
    wallet: WalletConnection;
  }): Promise<SimulateResult> {
    if (!this.stationExtension) {
      throw new Error("Terra Station is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const connect = await this.connect({ chainId: wallet.network.chainId });

    if (connect.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    if (connect.network.chainId !== wallet.network.chainId) {
      throw new Error(`Wallet not connected to the network with chainId "${wallet.network.chainId}"`);
    }

    const processedMessages = messages.map((message) => message.toCosmosMsg());

    try {
      const signer = new FakeOfflineSigner(wallet);
      const signingCosmWasmClient = await SigningCosmWasmClient.connectWithSigner(network.rpc || "", signer, {
        registry: this.registry,
      });

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

  broadcast({
    messages,
    wallet,
    feeAmount,
    gasLimit,
    memo,
  }: {
    messages: TransactionMsg[];
    wallet: WalletConnection;
    feeAmount?: string | null;
    gasLimit?: string | null;
    memo?: string | null;
    mobile?: boolean;
  }): Promise<BroadcastResult> {
    return new Promise(async (resolve, reject) => {
      if (!this.stationExtension) {
        reject("Terra Station is not available");
        throw new Error("Terra Station is not available");
      }

      const network = this.networks.get(wallet.network.chainId);

      if (!network) {
        reject(`Network with chainId "${wallet.network.chainId}" not found`);
        throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
      }

      const connect = await this.connect({ chainId: network.chainId });

      if (connect.account.address !== wallet.account.address) {
        reject("Wallet not connected");
        throw new Error("Wallet not connected");
      }

      if (connect.network.chainId !== wallet.network.chainId) {
        reject(`Wallet not connected to the network with chainId "${wallet.network.chainId}"`);
        throw new Error(`Wallet not connected to the network with chainId "${wallet.network.chainId}"`);
      }

      const processedMessages = messages.map((message) => message.toTerraExtensionMsg());

      const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
      const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
      const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
      const fee = JSON.stringify({
        amount: [{ amount: feeAmount && feeAmount != "auto" ? feeAmount : gas, denom: gasPrice.denom }],
        gas_limit: gasLimit || gas,
      });

      const post = await this.stationExtension.post({
        messages: processedMessages,
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

  async sign({
    messages,
    wallet,
    feeAmount,
    gasLimit,
    memo,
  }: {
    messages: TransactionMsg[];
    wallet: WalletConnection;
    feeAmount?: string | null;
    gasLimit?: string | null;
    memo?: string | null;
    mobile?: boolean;
  }): Promise<SigningResult> {
    if (!this.stationExtension) {
      throw new Error("Terra Station is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const connect = await this.connect({ chainId: network.chainId });

    if (connect.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    if (connect.network.chainId !== wallet.network.chainId) {
      throw new Error(`Wallet not connected to the network with chainId "${wallet.network.chainId}"`);
    }

    const processedMessages = messages.map((message) => message.toTerraExtensionMsg());

    const feeCurrency = wallet.network.feeCurrencies?.[0] || wallet.network.defaultCurrency || DEFAULT_CURRENCY;
    const gasPrice = GasPrice.fromString(wallet.network.gasPrice || DEFAULT_GAS_PRICE);
    const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
    const fee = JSON.stringify({
      amount: [{ amount: feeAmount && feeAmount != "auto" ? feeAmount : gas, denom: gasPrice.denom }],
      gas_limit: gasLimit || gas,
    });

    const signing = await this.stationExtension.sign({
      messages: processedMessages,
      fee,
      memo: memo || "",
      chainId: network.chainId,
    });

    return {
      signatures: signing?.result.signatures.map((signature) => fromBase64(signature)),
      response: signing?.result,
    };
  }
};

export default TerraStationProvider;
