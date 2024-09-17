"use client";

import { useState } from "react";
import { MsgExecuteContract, useShuttle } from "@delphi-labs/shuttle-react";

import useWallet from "@/hooks/useWallet";

export function ArbitrarySign() {
  const { signArbitrary, verifyArbitrary, broadcast } = useShuttle();
  const wallet = useWallet();

  const [data, setData] = useState("");

  const onSign = async () => {
    const bytes = Buffer.from(data, "utf-8");
    try {
      await broadcast({
        wallet,
        messages: [
          new MsgExecuteContract({
            contract: "inj1n8n0p5l48g7xy9y7k4hu694jl4c82ej4mwqmfz",
            msg: {
              buy_token: {
                token_id: "18",
                contract_address: "inj1rcevr4qezds2hqs9mqj3spzu0lc2fr87qur8zr",
                class_id: "injective",
              },
            },
            sender: wallet.account.address,
            funds: [{
              denom: "inj",
              amount: "1000000000000000000",
            }],
          })
        ]
      })
    } catch (error) {
      console.error("broadcast error", error);
    }
    // signArbitrary({
    //   wallet,
    //   data: bytes,
    // })
    //   .then(async (result) => {
    //     console.log("sign arbitrary result", result);

    //     console.group("###### verifying signature.... ########");
    //     const verification = await verifyArbitrary({
    //       wallet,
    //       data: bytes,
    //       signResult: result,
    //     });
    //     console.log("verification result:", verification);
    //     console.log("####################################");
    //     console.groupEnd();
    //   })
    //   .catch((error) => {
    //     console.error("sign arbitrary error", error);
    //   });
  };

  return (
    <>
      <h2>Sign arbitrary</h2>
      <textarea value={data} onChange={(e) => setData(e.target.value)} style={{ width: "450px", height: "100px" }} />
      <button onClick={onSign}>Sign</button>
    </>
  );
}
