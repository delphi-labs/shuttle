import { TransactionMsg, BroadcastResult, SigningResult, SimulateResult } from "../internals/transaction";
import { Network } from "../internals/network";
import { WalletConnection } from "../internals/wallet";
import { MobileConnectResponse } from "../internals";

export interface MobileWalletProvider {
  id: string;
  name: string;
  networks: Map<string, Network>;
  initializing: boolean;
  initialized: boolean;
  setOnUpdateCallback(callback: () => void): void;
  init(): Promise<void>;
  connect(options: {
    chainId: string;
    callback?: (walletConnection: WalletConnection) => void;
  }): Promise<MobileConnectResponse>;
  disconnect(options: { wallet: WalletConnection }): Promise<void>;
  simulate(options: { messages: TransactionMsg[]; wallet: WalletConnection }): Promise<SimulateResult>;
  broadcast(options: {
    messages: TransactionMsg[];
    wallet: WalletConnection;
    feeAmount?: string | null;
    gasLimit?: string | null;
    memo?: string | null;
    mobile?: boolean;
  }): Promise<BroadcastResult>;
  sign(options: {
    messages: TransactionMsg[];
    wallet: WalletConnection;
    feeAmount?: string | null;
    gasLimit?: string | null;
    memo?: string | null;
    mobile?: boolean;
  }): Promise<SigningResult>;
}

export default MobileWalletProvider;
