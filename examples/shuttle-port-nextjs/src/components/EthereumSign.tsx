"use client";

import { useState } from "react";
import { EthSignType } from "@delphi-labs/shuttle";
import { useShuttle } from "@delphi-labs/shuttle-react";

import useWallet from "@/hooks/useWallet";

export function EthereumSign() {
  const { signEthereum } = useShuttle();
  const wallet = useWallet();

  const [data, setData] = useState("");

  const onSign = () => {
    signEthereum({
      wallet,
      data: data,
      type: EthSignType.MESSAGE,
    })
      .then(async (result) => {
        console.log("sign ethereum result", result);
      })
      .catch((error) => {
        console.error("sign ethereum error", error);
      });
  };

  return (
    <>
      <h2>Sign Ethereum</h2>
      <textarea value={data} onChange={(e) => setData(e.target.value)} style={{ width: "450px", height: "100px" }} />
      <button onClick={onSign}>Sign</button>
    </>
  );
}
