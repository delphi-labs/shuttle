import type { TransactionMsg, BroadcastResult, SigningResult, SimulateResult } from "../../internals/transactions";
import type { Network, NetworkCurrency } from "../../internals/network";
import type { MobileConnectResponse } from "../../internals/providers";
import type { WalletConnection, WalletMobileSession } from "../../internals/wallet";
import SimulateClient from "../../internals/cosmos/SimulateClient";
import BroadcastClient from "../../internals/cosmos/BroadcastClient";
import MobileProviderAdapter from "../../internals/adapters/mobile/MobileProviderAdapter";

export abstract class WalletMobileProvider {
  id: string;
  name: string;
  networks: Map<string, Network>;
  initializing: boolean = false;
  initialized: boolean = false;
  onUpdate?: () => void;

  mobileProviderAdapter: MobileProviderAdapter;

  constructor({
    id,
    name,
    networks,
    mobileProviderAdapter,
  }: {
    id: string;
    name: string;
    networks: Network[];
    mobileProviderAdapter: MobileProviderAdapter;
  }) {
    this.id = id;
    this.name = name;
    this.networks = new Map(networks.map((network) => [network.chainId, network]));
    this.mobileProviderAdapter = mobileProviderAdapter;
  }

  setOnUpdateCallback(callback: () => void): void {
    this.onUpdate = callback;
  }

  abstract generateIntents(uri?: string): { qrCodeUrl: string; iosUrl: string; androidUrl: string };

  async init(params: { walletConnectProjectId?: string }): Promise<void> {
    if (this.initializing || this.initialized) {
      return;
    }

    this.initializing = true;

    try {
      await this.mobileProviderAdapter.init(this, params);
    } catch (error) {
      this.initializing = false;
      throw error;
    }

    this.initialized = true;
    this.initializing = false;
  }

  async connect({
    chainId,
    callback,
  }: {
    chainId: string;
    callback?: ((walletConnection: WalletConnection) => void) | undefined;
  }): Promise<MobileConnectResponse> {
    if (!this.mobileProviderAdapter.isReady()) {
      throw new Error(`${this.name} is not available`);
    }

    const network = this.networks.get(chainId);
    if (!network) {
      throw new Error(`Network with chainId "${chainId}" not found`);
    }

    const uri = await this.mobileProviderAdapter.connect(this, { network, callback });

    const intents = this.generateIntents(uri);

    return {
      qrCodeUrl: intents.qrCodeUrl,
      iosUrl: intents.iosUrl,
      androidUrl: intents.androidUrl,
    };
  }

  async disconnect({ wallet }: { wallet: WalletConnection }): Promise<void> {
    if (!this.mobileProviderAdapter.isReady() || this.mobileProviderAdapter.isSessionExpired(wallet.mobileSession)) {
      return;
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      return;
    }

    void this.mobileProviderAdapter.disconnect(this, { wallet, network });
  }

  async getWalletConnection({
    chainId,
    mobileSession,
  }: {
    chainId: string;
    mobileSession: WalletMobileSession;
  }): Promise<WalletConnection> {
    if (!this.mobileProviderAdapter.isReady()) {
      throw new Error(`${this.name} is not available`);
    }

    if (this.mobileProviderAdapter.isSessionExpired(mobileSession)) {
      throw new Error(`${this.name} connection has expired, please reconnect.`);
    }

    const network = this.networks.get(chainId);

    if (!network) {
      throw new Error(`Network with chainId "${chainId}" not found`);
    }

    return await this.mobileProviderAdapter.getWalletConnection(this, { network, mobileSession });
  }

  async simulate({
    messages,
    wallet,
  }: {
    messages: TransactionMsg[];
    wallet: WalletConnection;
  }): Promise<SimulateResult> {
    if (!this.mobileProviderAdapter.isReady()) {
      throw new Error(`${this.name} is not available`);
    }

    if (this.mobileProviderAdapter.isSessionExpired(wallet.mobileSession)) {
      throw new Error(`${this.name} connection has expired, please reconnect.`);
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const currentWallet = await this.getWalletConnection({
      chainId: network.chainId,
      mobileSession: wallet.mobileSession,
    });

    if (currentWallet.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    return SimulateClient.run({
      network,
      wallet,
      messages,
    });
  }

  async sign({
    messages,
    wallet,
    feeAmount,
    gasLimit,
    memo,
    overrides,
  }: {
    messages: TransactionMsg[];
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
  }): Promise<SigningResult> {
    if (!this.mobileProviderAdapter.isReady()) {
      throw new Error(`${this.name} is not available`);
    }

    if (this.mobileProviderAdapter.isSessionExpired(wallet.mobileSession)) {
      throw new Error(`${this.name} connection has expired, please reconnect.`);
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const currentWallet = await this.getWalletConnection({
      chainId: network.chainId,
      mobileSession: wallet.mobileSession,
    });

    if (currentWallet.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    return await this.mobileProviderAdapter.sign(this, {
      network,
      wallet,
      messages,
      feeAmount,
      gasLimit,
      memo,
      overrides,
      intents: this.generateIntents(),
    });
  }

  async broadcast({
    messages,
    wallet,
    feeAmount,
    gasLimit,
    memo,
    overrides,
  }: {
    messages: TransactionMsg[];
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
  }): Promise<BroadcastResult> {
    if (!this.mobileProviderAdapter.isReady()) {
      throw new Error(`${this.name} is not available`);
    }

    if (this.mobileProviderAdapter.isSessionExpired(wallet.mobileSession)) {
      throw new Error(`${this.name} connection has expired, please reconnect.`);
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const currentWallet = await this.getWalletConnection({
      chainId: network.chainId,
      mobileSession: wallet.mobileSession,
    });

    if (currentWallet.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    const signResult = await this.sign({ messages, wallet, feeAmount, gasLimit, memo, overrides });

    if (!signResult.response) {
      return {
        hash: "",
        rawLogs: "",
        events: [],
        response: null,
      };
    }

    return await BroadcastClient.execute({
      network,
      signResult,
      overrides,
    });
  }

  async signArbitrary({ wallet, data }: { wallet: WalletConnection; data: Uint8Array }): Promise<SigningResult> {
    if (!this.mobileProviderAdapter.isReady()) {
      throw new Error(`${this.name} is not available`);
    }

    if (this.mobileProviderAdapter.isSessionExpired(wallet.mobileSession)) {
      throw new Error(`${this.name} connection has expired, please reconnect.`);
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const currentWallet = await this.getWalletConnection({
      chainId: network.chainId,
      mobileSession: wallet.mobileSession,
    });

    if (currentWallet.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    return await this.mobileProviderAdapter.signArbitrary(this, {
      network,
      wallet,
      data,
      intents: this.generateIntents(),
    });
  }

  async verifyArbitrary({
    wallet,
    data,
    signResult,
  }: {
    wallet: WalletConnection;
    data: Uint8Array;
    signResult: SigningResult;
  }): Promise<boolean> {
    if (!this.mobileProviderAdapter.isReady()) {
      throw new Error(`${this.name} is not available`);
    }

    if (this.mobileProviderAdapter.isSessionExpired(wallet.mobileSession)) {
      throw new Error(`${this.name} connection has expired, please reconnect.`);
    }

    const network = this.networks.get(wallet.network.chainId);

    if (!network) {
      throw new Error(`Network with chainId "${wallet.network.chainId}" not found`);
    }

    const currentWallet = await this.getWalletConnection({
      chainId: network.chainId,
      mobileSession: wallet.mobileSession,
    });

    if (currentWallet.account.address !== wallet.account.address) {
      throw new Error("Wallet not connected");
    }

    return await this.mobileProviderAdapter.verifyArbitrary(this, {
      network,
      wallet,
      data,
      signResult,
    });
  }
}

export default WalletMobileProvider;
