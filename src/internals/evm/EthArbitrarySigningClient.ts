import { getEthereumAddress } from "@injectivelabs/sdk-ts";
import { recoverPersonalSignature } from "@metamask/eth-sig-util";
import { bufferToHex } from "ethereumjs-util";

import { WalletConnection } from "../wallet";

export class EthArbitrarySigningClient {
  static prepare(data: Uint8Array) {
    return `0x${Buffer.from(data).toString("hex")}`;
  }

  static verify({ wallet, data, signature }: { wallet: WalletConnection; data: Uint8Array; signature: Uint8Array }) {
    const recoveredAddress = recoverPersonalSignature({
      data: `0x${Buffer.from(data).toString("hex")}`,
      signature: bufferToHex(Buffer.from(signature)),
    });

    return recoveredAddress === getEthereumAddress(wallet.account.address);
  }
}

export default EthArbitrarySigningClient;
