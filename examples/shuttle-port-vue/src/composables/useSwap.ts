import { ComputedRef, Ref, computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { MsgExecuteContract, WalletConnection } from "@delphi-labs/shuttle";
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

function useSwapSimulate(
  amount: Ref<string>,
  offerAssetAddress: Ref<string>,
  returnAssetAddress: Ref<string>,
  poolAddress: Ref<string>,
  wallet: ComputedRef<WalletConnection | null>,
) {
  const isEnabled = computed(() => {
    return (
      !!amount.value && !!offerAssetAddress.value && !!returnAssetAddress.value && !!poolAddress.value && !!wallet.value
    );
  });

  return useQuery({
    queryKey: ["swap-simulate", amount, offerAssetAddress, returnAssetAddress, poolAddress],
    queryFn: async () => {
      if (
        !amount.value ||
        !offerAssetAddress.value ||
        !returnAssetAddress.value ||
        !poolAddress.value ||
        !wallet.value
      ) {
        return null;
      }

      if (BigNumber(amount.value).isLessThanOrEqualTo(0)) {
        return null;
      }

      const client = await CosmWasmClient.connect(wallet.value.network.rpc || "");

      let assetInfo: AssetInfo = {
        token: { contract_addr: offerAssetAddress.value },
      };

      if (
        offerAssetAddress.value.startsWith("u") ||
        offerAssetAddress.value === "inj" ||
        offerAssetAddress.value.startsWith("ibc/")
      ) {
        assetInfo = { native_token: { denom: offerAssetAddress.value } };
      }

      const response = await client.queryContractSmart(poolAddress.value, {
        simulation: {
          offer_asset: {
            amount: BigNumber(amount.value).times(getTokenDecimals(offerAssetAddress.value)).toString(),
            info: assetInfo,
          },
        },
      });

      return {
        amount: BigNumber(response.return_amount).div(getTokenDecimals(returnAssetAddress.value)).toString(),
        commission: BigNumber(response.commission_amount).div(getTokenDecimals(returnAssetAddress.value)).toString(),
        spread: BigNumber(response.spread_amount).div(getTokenDecimals(returnAssetAddress.value)).toString(),
        beliefPrice: BigNumber(amount.value)
          .times(getTokenDecimals(offerAssetAddress.value))
          .div(response.return_amount)
          .toString(),
        price: BigNumber(amount.value)
          .times(getTokenDecimals(offerAssetAddress.value))
          .div(BigNumber(response.return_amount).div(getTokenDecimals(returnAssetAddress.value)))
          .toString(),
      };
    },
    enabled: isEnabled,
  });
}

export default function useSwap(
  amount: Ref<string>,
  offerAssetAddress: Ref<string>,
  returnAssetAddress: Ref<string>,
  poolAddress: Ref<string>,
  slippage: string = "0.005",
) {
  const wallet = useWallet();
  const simulate = useSwapSimulate(amount, offerAssetAddress, returnAssetAddress, poolAddress, wallet);

  const msgs = computed(() => {
    if (!amount.value || !offerAssetAddress.value || !returnAssetAddress.value || !poolAddress.value) {
      return [];
    }

    if (BigNumber(amount.value).isLessThanOrEqualTo(0)) {
      return [];
    }

    if (!simulate.data.value) {
      return [];
    }

    if (
      offerAssetAddress.value.startsWith("u") ||
      offerAssetAddress.value === "inj" ||
      offerAssetAddress.value.startsWith("ibc/")
    ) {
      return [
        new MsgExecuteContract({
          sender: wallet.value.account.address,
          contract: poolAddress.value,
          msg: {
            swap: {
              offer_asset: {
                amount: BigNumber(amount.value).times(getTokenDecimals(offerAssetAddress.value)).toString(),
                info: { native_token: { denom: offerAssetAddress.value } },
              },
              max_spread: slippage,
              belief_price: BigNumber(simulate.data.value?.beliefPrice || "1")
                .toFixed(18)
                .toString(),
            },
          },
          funds: [
            {
              denom: offerAssetAddress.value,
              amount: BigNumber(amount.value).times(getTokenDecimals(offerAssetAddress.value)).toString(),
            },
          ],
        }),
      ];
    }

    return [
      new MsgExecuteContract({
        sender: wallet.value.account.address,
        contract: offerAssetAddress.value,
        msg: {
          send: {
            amount: BigNumber(amount.value).times(getTokenDecimals(offerAssetAddress.value)).toString(),
            contract: poolAddress,
            msg: objectToBase64({
              swap: {
                max_spread: slippage,
                belief_price: BigNumber(simulate.data.value?.beliefPrice || "1")
                  .toFixed(18)
                  .toString(),
              },
            }),
          },
        },
      }),
    ];
  });

  return {
    msgs,
    simulate,
  };
}
