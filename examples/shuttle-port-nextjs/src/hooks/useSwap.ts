import { useMemo } from "react";
import { MsgExecuteContract, WalletConnection } from "@delphi-labs/shuttle-react";
import { useQuery } from "@tanstack/react-query";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import BigNumber from "bignumber.js";

import { objectToBase64 } from "@/utils/encoding";
import { getTokenDecimals } from "@/config/tokens";
import useWallet from "./useWallet";

type AssetInfo =
  | {
      token: {
        contract_addr: string;
      };
    }
  | {
      native_token: {
        denom: string;
      };
    };

type SimulateProps = {
  amount: string;
  offerAssetAddress: string;
  returnAssetAddress: string;
  poolAddress: string;
  wallet: WalletConnection | null;
};

function useSwapSimulate({ amount, offerAssetAddress, returnAssetAddress, poolAddress, wallet }: SimulateProps) {
  return useQuery(
    ["swap-simulate", amount, offerAssetAddress, returnAssetAddress, poolAddress],
    async () => {
      if (!amount || !offerAssetAddress || !returnAssetAddress || !poolAddress || !wallet) {
        return null;
      }

      if (BigNumber(amount).isLessThanOrEqualTo(0)) {
        return null;
      }

      const client = await CosmWasmClient.connect(wallet.network.rpc || "");

      let assetInfo: AssetInfo = {
        token: { contract_addr: offerAssetAddress },
      };
      if (offerAssetAddress.startsWith("u") || offerAssetAddress === "inj" || offerAssetAddress.startsWith("ibc/")) {
        assetInfo = { native_token: { denom: offerAssetAddress } };
      }

      const response = await client.queryContractSmart(poolAddress, {
        simulation: {
          offer_asset: {
            amount: BigNumber(amount).times(getTokenDecimals(offerAssetAddress)).toString(),
            info: assetInfo,
          },
        },
      });

      return {
        amount: BigNumber(response.return_amount).div(getTokenDecimals(returnAssetAddress)).toString(),
        commission: BigNumber(response.commission_amount).div(getTokenDecimals(returnAssetAddress)).toString(),
        spread: BigNumber(response.spread_amount).div(getTokenDecimals(returnAssetAddress)).toString(),
        beliefPrice: BigNumber(amount)
          .times(getTokenDecimals(offerAssetAddress))
          .div(response.return_amount)
          .toString(),
        price: BigNumber(amount)
          .times(getTokenDecimals(offerAssetAddress))
          .div(BigNumber(response.return_amount).div(getTokenDecimals(returnAssetAddress)))
          .toString(),
      };
    },
    {
      enabled: !!amount && !!offerAssetAddress && !!returnAssetAddress && !!poolAddress && !!wallet,
    },
  );
}

type Props = {
  amount: string;
  offerAssetAddress: string;
  returnAssetAddress: string;
  poolAddress: string;
  slippage?: string;
};

export default function useSwap({
  amount,
  offerAssetAddress,
  returnAssetAddress,
  poolAddress,
  slippage = "0.005",
}: Props) {
  const wallet = useWallet();
  const simulate = useSwapSimulate({
    amount,
    offerAssetAddress,
    returnAssetAddress,
    poolAddress,
    wallet,
  });

  const msgs = useMemo(() => {
    if (!amount || !offerAssetAddress || !returnAssetAddress || !poolAddress || !wallet) {
      return [];
    }

    if (BigNumber(amount).isLessThanOrEqualTo(0)) {
      return [];
    }

    if (offerAssetAddress.startsWith("u") || offerAssetAddress === "inj" || offerAssetAddress.startsWith("ibc/")) {
      return [
        new MsgExecuteContract({
          sender: wallet.account.address,
          contract: poolAddress,
          msg: {
            swap: {
              offer_asset: {
                amount: BigNumber(amount).times(getTokenDecimals(offerAssetAddress)).toString(),
                info: { native_token: { denom: offerAssetAddress } },
              },
              max_spread: slippage,
              belief_price: BigNumber(simulate.data?.beliefPrice || "1")
                .toFixed(18)
                .toString(),
            },
          },
          funds: [
            {
              denom: offerAssetAddress,
              amount: BigNumber(amount).times(getTokenDecimals(offerAssetAddress)).toString(),
            },
          ],
        }),
      ];
    }

    return [
      new MsgExecuteContract({
        sender: wallet.account.address,
        contract: offerAssetAddress,
        msg: {
          send: {
            amount: BigNumber(amount).times(getTokenDecimals(offerAssetAddress)).toString(),
            contract: poolAddress,
            msg: objectToBase64({
              swap: {
                max_spread: slippage,
                belief_price: BigNumber(simulate.data?.beliefPrice || "1")
                  .toFixed(18)
                  .toString(),
              },
            }),
          },
        },
      }),
    ];
  }, [wallet, offerAssetAddress, returnAssetAddress, poolAddress, amount, slippage, simulate]);

  return useMemo(() => {
    return { msgs, simulate };
  }, [msgs, simulate]);
}
