import { TransactionMsg, BroadcastResult, SigningResult, SimulateResult } from "../internals/transaction";
import { Network } from "../internals/network";
import { WalletConnection } from "../internals/wallet";

export interface WalletProvider {
  id: string;
  name: string;
  networks: Map<string, Network>;
  initializing: boolean;
  initialized: boolean;
  init(): Promise<void>;
  setOnUpdateCallback(callback: () => void): void;
  connect(options: { chainId: string }): Promise<WalletConnection>;
  disconnect(options: { wallet: WalletConnection }): Promise<void>;
  simulate: (options: { messages: TransactionMsg[]; wallet: WalletConnection }) => Promise<SimulateResult>;
  broadcast(options: {
    messages: TransactionMsg[];
    wallet: WalletConnection;
    feeAmount?: string | null;
    gasLimit?: string | null;
    memo?: string | null;
    mobile?: boolean;
    overrides?: {
      rpc?: string;
      rest?: string;
    };
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

export default WalletProvider;
