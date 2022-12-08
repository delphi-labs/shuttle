import { Ethereum } from "../extensions/Metamask";
import { BroadcastResult, Network, SigningResult, TransactionMsg, WalletConnection } from "../internals";
import WalletProvider from "./WalletProvider";

declare global {
  interface Window {
    ethereum?: Ethereum;
  }
}

class MetamaskProvider implements WalletProvider {
  id: string;
  name: string;
  networks: Map<string, Network>;
  initializing: boolean = false;
  initialized: boolean = false;
  metamask: any;

  constructor({ id = "metamask", name = "Metamask", networks }: { id?: string; name?: string; networks: Network[] }) {
    this.id = id;
    this.name = name;
    this.networks = new Map(networks.map((network) => [network.chainId, network]));
  }

  async init(): Promise<void> {
    if (this.initializing || this.initialized) {
      return;
    }

    this.initializing = true;

    if (!window.ethereum || !window.ethereum.isMetaMask) {
      this.initializing = false;
      throw new Error("Metamask is not available");
    }

    this.metamask = window.ethereum;
    this.initialized = true;
    this.initializing = false;
  }

  async connect(chainId: string): Promise<WalletConnection> {
    if (!this.metamask) {
      throw new Error("Metamask is not available");
    }

    const network = this.networks.get(chainId);

    if (!network) {
      throw new Error(`Network with chainId "${chainId}" not found`);
    }

    if (!network.evm) {
      throw new Error(`Network with chainId "${chainId}" is not an EVM compatible network`);
    }

    // const chain = await this.metamask.request({ method: 'eth_chainId' });
    // console.log("chain", chain)

    const accounts = await this.metamask.request({
      method: "eth_requestAccounts",
    });

    const address = network.evm.deriveCosmosAddress(accounts[0]);

    return {
      id: `provider:${this.id}:network:${network.chainId}:address:${address}`,
      providerId: this.id,
      account: {
        address: address,
        pubkey: null,
        algo: "secp256k1",
      },
      network,
    };
  }

  broadcast(
    messages: TransactionMsg<any>[],
    wallet: WalletConnection,
    feeAmount?: string | null | undefined,
    gasLimit?: string | null | undefined,
    memo?: string | null | undefined,
  ): Promise<BroadcastResult> {
    throw new Error("Method not implemented.");
  }

  sign(
    messages: TransactionMsg<any>[],
    wallet: WalletConnection,
    feeAmount?: string | null | undefined,
    gasLimit?: string | null | undefined,
    memo?: string | null | undefined,
  ): Promise<SigningResult> {
    throw new Error("Method not implemented.");
  }
}

export default MetamaskProvider;
