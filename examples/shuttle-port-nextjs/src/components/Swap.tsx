"use client";

import { useState } from "react";
import { useShuttle, isMobile } from "@delphi-labs/shuttle-react";
import BigNumber from "bignumber.js";

import { fromNetworkToNativeSymbol } from "@/config/networks";
import { DEFAULT_TOKEN_DECIMALS, TOKENS } from "@/config/tokens";
import { POOLS } from "@/config/pools";
import { useShuttlePortStore } from "@/config/store";
import useBalance from "@/hooks/useBalance";
import useWallet from "@/hooks/useWallet";
import useSwap from "@/hooks/useSwap";
import useFeeEstimate from "@/hooks/useFeeEstimate";

export function Swap() {
  const { broadcast } = useShuttle();
  const wallet = useWallet();
  const currentNetworkId = useShuttlePortStore((state) => state.currentNetworkId);

  const poolAddress = POOLS[currentNetworkId]?.astroNative;
  const [token1, setToken1] = useState(TOKENS[currentNetworkId]?.native);
  const [token2, setToken2] = useState(TOKENS[currentNetworkId]?.astro);
  const [token1Amount, setToken1Amount] = useState("0");
  // const [token2Amount, setToken2Amount] = useState("0");
  const token1Balance = useBalance(token1);
  const token2Balance = useBalance(token2);
  const [isSwapping, setIsSwapping] = useState(false);

  const swap = useSwap({
    amount: token1Amount,
    offerAssetAddress: token1,
    returnAssetAddress: token2,
    poolAddress,
  });

  const { data: swapFeeEstimate } = useFeeEstimate({
    messages: swap.msgs,
  });

  const onSubmit = () => {
    setIsSwapping(true);
    broadcast({
      wallet,
      messages: swap.msgs,
      feeAmount: swapFeeEstimate?.fee?.amount,
      gasLimit: swapFeeEstimate?.gasLimit,
    })
      .then((result) => {
        console.log("result", result);
      })
      .catch((error) => {
        console.error("Broadcast error", error);
      })
      .finally(() => {
        setIsSwapping(false);
        setToken1Amount("0");
        token1Balance.refetch();
        token2Balance.refetch();
      });
  };

  return (
    <>
      <h2>Swap</h2>

      {!poolAddress && <p>Pool not found.</p>}

      {poolAddress && (
        <>
          <div>
            <select
              value={token1}
              onChange={(e) => {
                const token = e.target.value;
                if (token !== token1) {
                  setToken1(token);
                  setToken2(token1);
                }
              }}
            >
              <option value={TOKENS[currentNetworkId].native}>{fromNetworkToNativeSymbol(currentNetworkId)}</option>
              <option value={TOKENS[currentNetworkId].astro}>ASTRO</option>
            </select>
            <input value={token1Amount} onChange={(e) => setToken1Amount(e.target.value)} />
            <p>Balance: {token1Balance.data}</p>
          </div>

          <select
            value={token2}
            onChange={(e) => {
              const token = e.target.value;
              if (token !== token2) {
                setToken1(token2);
                setToken2(token);
              }
            }}
          >
            <option value={TOKENS[currentNetworkId].native}>{fromNetworkToNativeSymbol(currentNetworkId)}</option>
            <option value={TOKENS[currentNetworkId].astro}>ASTRO</option>
          </select>
          {/* <input
        value={token2Amount}
        onChange={(e) => setToken2Amount(e.target.value)}
      /> */}
          <input disabled value={swap.simulate.data?.amount || "0"} />
          <p>Balance: {token2Balance.data}</p>

          <button onClick={onSubmit} disabled={!(swapFeeEstimate && swapFeeEstimate.fee) || isSwapping}>
            {isSwapping ? "Processing..." : "Swap"}
          </button>
          {swapFeeEstimate && swapFeeEstimate.fee && (
            <p>
              Fee:{" "}
              {BigNumber(swapFeeEstimate.fee.amount)
                .div(DEFAULT_TOKEN_DECIMALS || 1)
                .toString()}{" "}
              {swapFeeEstimate.fee.denom}
            </p>
          )}
        </>
      )}
    </>
  );
}
