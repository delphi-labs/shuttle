import { TransactionMsg, BroadcastResult, SigningResult } from "../internals/transaction";
import { Network } from "../internals/network";
import { WalletConnection } from "../internals/wallet";

export interface WalletProvider {
  id: string;
  name: string;
  networks: Map<string, Network>;
  initializing: boolean;
  initialized: boolean;
  init(): Promise<void>;
  connect(chainId: string): Promise<WalletConnection>;
  broadcast(
    messages: TransactionMsg[],
    wallet: WalletConnection,
    feeAmount?: string | null,
    gasLimit?: string | null,
    memo?: string | null,
  ): Promise<BroadcastResult>;
  sign(
    messages: TransactionMsg[],
    wallet: WalletConnection,
    feeAmount?: string | null,
    gasLimit?: string | null,
    memo?: string | null,
  ): Promise<SigningResult>;
}

export default WalletProvider;
