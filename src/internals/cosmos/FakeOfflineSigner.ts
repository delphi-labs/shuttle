import { fromBase64 } from "@cosmjs/encoding";
import { OfflineDirectSigner, AccountData } from "@cosmjs/proto-signing";

import { WalletConnection } from "../wallet";

export default class FakeOfflineSigner implements OfflineDirectSigner {
  private readonly wallet: WalletConnection | null;

  constructor(wallet: WalletConnection | null) {
    this.wallet = wallet;
  }

  async getAccounts(): Promise<readonly AccountData[]> {
    return [
      {
        address: this.wallet?.account.address || "",
        algo: this.wallet?.account.algo || "secp256k1",
        pubkey: fromBase64(this.wallet?.account.pubkey || "A6AvMXexMnIxR12przvcF3nT4JU6+WeMwT3S/Zu0Nb/o"),
      },
    ];
  }

  async signDirect(_signerAddress: string, _signDoc: any): Promise<any> {
    throw new Error("Method not implemented.");
  }
}
