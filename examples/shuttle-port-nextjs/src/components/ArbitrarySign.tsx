"use client";

import { useState } from "react";
import { useShuttle } from "@delphi-labs/shuttle-react";

import useWallet from "@/hooks/useWallet";

export function ArbitrarySign() {
  const { signArbitrary, verifyArbitrary } = useShuttle();
  const wallet = useWallet();

  const [data, setData] = useState("");

  const onSign = () => {
    const bytes = Buffer.from(data, "utf-8");
    signArbitrary({
      wallet,
      data: bytes,
    })
      .then(async (result) => {
        console.log("sign arbitrary result", result);

        console.group("###### verifying signature.... ########");
        const verification = await verifyArbitrary({
          wallet,
          data: bytes,
          signResult: result,
        });
        console.log("verification result:", verification);
        console.log("####################################");
        console.groupEnd();
      })
      .catch((error) => {
        console.error("sign arbitrary error", error);
      });
  };

  return (
    <>
      <h2>Sign arbitrary</h2>
      <textarea value={data} onChange={(e) => setData(e.target.value)} style={{ width: "450px", height: "100px" }} />
      <button onClick={onSign}>Sign</button>
    </>
  );
}
