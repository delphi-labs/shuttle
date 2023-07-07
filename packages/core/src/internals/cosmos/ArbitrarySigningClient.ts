import { serializeSignDoc } from "@cosmjs/amino";
import { Secp256k1, Secp256k1Signature, sha256 } from "@cosmjs/crypto";

import { DEFAULT_CURRENCY, Network } from "../network";
import { WalletConnection } from "../wallet";

export function createEmptySignDoc(signer: string, data: Uint8Array) {
  return {
    chain_id: "",
    account_number: "0",
    sequence: "0",
    fee: {
      gas: "0",
      amount: [],
    },
    msgs: [
      {
        type: "sign/MsgSignData",
        value: {
          signer,
          data: Buffer.from(data).toString("base64"),
        },
      },
    ],
    memo: "",
  };
}

export class ArbitrarySigningClient {
  static prepareSigningWithMemo({ network, data }: { network: Network; data: Uint8Array }) {
    const feeCurrency = network.feeCurrencies?.[0] || network.defaultCurrency || DEFAULT_CURRENCY;

    return {
      chain_id: network.chainId,
      account_number: "0",
      sequence: "0",
      fee: {
        gas: "0",
        amount: [{ denom: feeCurrency.coinMinimalDenom, amount: "0" }],
      },
      msgs: [],
      memo: Buffer.from(data).toString("base64"),
    };
  }

  static async verifyMemoSignature({
    network,
    wallet,
    data,
    signature,
  }: {
    network: Network;
    wallet: WalletConnection;
    data: Uint8Array;
    signature: Uint8Array;
  }) {
    const signDoc = this.prepareSigningWithMemo({
      network,
      data,
    });

    return await Secp256k1.verifySignature(
      Secp256k1Signature.fromFixedLength(signature),
      sha256(serializeSignDoc(signDoc)),
      Buffer.from(wallet.account.pubkey || "", "base64"),
    );
  }

  static async verifyEmptyDocSignature({
    wallet,
    data,
    signature,
  }: {
    wallet: WalletConnection;
    data: Uint8Array;
    signature: Uint8Array;
  }) {
    const signDoc = createEmptySignDoc(wallet.account.address, data);

    return await Secp256k1.verifySignature(
      Secp256k1Signature.fromFixedLength(signature),
      sha256(serializeSignDoc(signDoc)),
      Buffer.from(wallet.account.pubkey || "", "base64"),
    );
  }
}

export default ArbitrarySigningClient;
