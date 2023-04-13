import { CosmWasmClient, SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { fromBase64 } from "@cosmjs/encoding";
import { calculateFee, GasPrice } from "@cosmjs/stargate";
import WalletProvider from "./WalletProvider";
import { WalletConnection } from "../internals/wallet";
import { DEFAULT_GAS_MULTIPLIER, Network } from "../internals/network";
import { TransactionMsg, BroadcastResult, SigningResult, SimulateResult } from "../internals/transaction";
import FakeOfflineSigner from "../internals/cosmos/FakeOfflineSigner";
import XDefiTerraExtension from "../extensions/XDefiTerraExtension";
import { Keplr } from "../extensions";

export type xfiKeplr = Keplr & { addListener?: (event: string, callback: () => void) => void };

declare global {
  interface Window {
    xfi?: {
      terra: any;
      keplr: xfiKeplr;
    };
  }
}

const DEFAULT_CURRENCY = {
  coinDenom: "LUNA",
  coinMinimalDenom: "uluna",
  coinDecimals: 6,
  coinGeckoId: "terra-luna-2",
};
const DEFAULT_GAS_PRICE = `0.2${DEFAULT_CURRENCY.coinDenom}`;

const mapChainIdToNetworkName = (chainId: string) => {
  switch (chainId) {
    case "pisco-1":
      return "testnet";
    case "phoenix-1":
      return "mainnet";
    default:
      throw new Error(`Invalid chain id: ${chainId}`);
  }
};

export const XDEFITerraProvider = class XDEFITerraProvider implements WalletProvider {
  id: string = "xfi-terra";
  name: string = "XDEFI Wallet - Terra";
  networks: Map<string, Network>;
  initializing: boolean = false;
  initialized: boolean = false;

  xdefi?: XDefiTerraExtension;

  constructor({ id, name, networks }: { id?: string; name?: string; networks: Network[] }) {
    if (id) {
      this.id = id;
    }
    if (name) {
      this.name = name;
    }
    this.networks = new Map(networks.map((network) => [network.chainId, network]));
  }

  setOnUpdateCallback(_callback: () => void): void {
    return;
  }

  async init(): Promise<void> {
    if (this.initializing || this.initialized) {
      return;
    }

    this.initializing = true;

    if (!window.xfi?.terra) {
      this.initializing = false;
      throw new Error("XDefi is not available");
    }

    this.xdefi = new XDefiTerraExtension();
    this.initialized = true;
    this.initializing = false;
  }

  async connect({ chainId }: { chainId: string }): Promise<WalletConnection> {
    if (!this.xdefi) {
      throw new Error("XDefi is not available");
    }

    const network = this.networks.get(chainId);

    if (!network) {
      throw new Error(`Network with chainId "${chainId}" not found`);
    }

    const account = await this.xdefi.connect(mapChainIdToNetworkName(chainId));
    const address = account[0];

    const info = await this.xdefi.info(mapChainIdToNetworkName(chainId));

    if (info.network.chainID !== chainId) {
      throw new Error(`Wallet not connected to the network with chainId "${chainId}"`);
    }

    const client = await CosmWasmClient.connect(network.rpc);
    const accountInfo = await client.getAccount(address);

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
      id: `provider:${this.id}:network:${network.chainId}:address:${accountInfo?.address || address}`,
      providerId: this.id,
      account: {
        address: accountInfo?.address || address,
        pubkey: accountInfo?.pubkey?.value || "",
        algo,
        isLedger: false, // @TODO: check if it's a ledger
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
    if (!this.xdefi) {
      throw new Error("XDefi is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const connect = await this.connect({ chainId: network.chainId });

    if (connect.account.address !== wallet.account.address) {
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
  }: {
    messages: TransactionMsg[];
    wallet: WalletConnection;
    feeAmount?: string | null;
    gasLimit?: string | null;
    memo?: string | null;
    mobile?: boolean;
  }): Promise<BroadcastResult> {
    return new Promise(async (resolve, reject) => {
      if (!this.xdefi) {
        reject("XDefi is not available");
        throw new Error("XDefi is not available");
      }

      const network = this.networks.get(wallet.network.chainId);

      if (!network) {
        throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
      }

      const connect = await this.connect({ chainId: network.chainId });

      if (connect.account.address !== wallet.account.address) {
        reject("Wallet not connected");
        throw new Error("Wallet not connected");
      }

      const processedMessages = messages.map((message) => message.toTerraExtensionMsg());

      const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
      const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
      const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
      const fee = JSON.stringify({
        amount: [{ amount: feeAmount && feeAmount != "auto" ? feeAmount : gas, denom: gasPrice.denom }],
        gas_limit: gasLimit || gas,
      });

      const post = await this.xdefi.post(
        mapChainIdToNetworkName(network.chainId),
        wallet.account.address,
        processedMessages,
        fee,
        network.gasPrice || DEFAULT_GAS_PRICE,
        memo ?? undefined,
      );

      if (post.code !== 0) {
        reject("Broadcast failed");
        throw new Error("Broadcast failed");
      }

      const client = await CosmWasmClient.connect(network.rpc);

      let tries = 0;
      const interval = setInterval(async () => {
        const tx = await client.getTx(post.txhash);
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
    if (!this.xdefi) {
      throw new Error("XDefi is not available");
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const connect = await this.connect({ chainId: network.chainId });

    if (connect.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    const processedMessages = messages.map((message) => message.toTerraExtensionMsg());

    const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;
    const gasPrice = GasPrice.fromString(network.gasPrice || DEFAULT_GAS_PRICE);
    const gas = String(gasPrice.amount.toFloatApproximation() * 10 ** feeCurrency.coinDecimals);
    const fee = JSON.stringify({
      amount: [{ amount: feeAmount && feeAmount != "auto" ? feeAmount : gas, denom: gasPrice.denom }],
      gas_limit: gasLimit || gas,
    });

    const signing = await this.xdefi.sign(
      mapChainIdToNetworkName(network.chainId),
      wallet.account.address,
      processedMessages,
      fee,
      network.gasPrice || DEFAULT_GAS_PRICE,
      memo ?? undefined,
    );

    return {
      signatures: signing?.result.signatures.map((signature) => fromBase64(signature)),
      response: signing?.result,
    };
  }
};

export default XDEFITerraProvider;
