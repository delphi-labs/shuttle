import { CosmWasmClient, IndexedTx } from "@cosmjs/cosmwasm-stargate";

export class TxWatcher {
  static async findTx(rpc: string, txhash: string): Promise<IndexedTx | null> {
    return new Promise(async (resolve, reject) => {
      const client = await CosmWasmClient.connect(rpc);
      let tries = 0;
      const interval = setInterval(async () => {
        const tx = await client.getTx(txhash);
        if (tx) {
          clearInterval(interval);
          resolve(tx);
          return;
        }
        if (tries > 150) {
          // 1 minute
          clearInterval(interval);
          reject("Tx not found after time out");
          throw new Error("Tx not found after time out");
        }
        tries++;
      }, 400);
    });
  }
}

export default TxWatcher;
