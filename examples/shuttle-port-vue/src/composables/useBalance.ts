import { Ref, computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";

import useWallet from "./useWallet";
import { getTokenDecimals } from "@/config/tokens";

export default function useBalance(tokenAddress: Ref<string>) {
  const wallet = useWallet();
  const isEnabled = computed(() => {
    return !!wallet.value && !!tokenAddress.value;
  });

  return useQuery({
    queryKey: ["balance", wallet, tokenAddress],
    queryFn: async () => {
      if (!wallet.value || !tokenAddress.value) {
        return 0;
      }

      const client = await CosmWasmClient.connect(wallet.value.network.rpc || "");

      if (tokenAddress.value.startsWith("u") || tokenAddress.value === "inj" || tokenAddress.value.startsWith("ibc/")) {
        const response = await client.getBalance(wallet.value.account.address || "", tokenAddress.value);
        return Number(response.amount) / getTokenDecimals(tokenAddress.value);
      }

      const response = await client.queryContractSmart(tokenAddress.value, {
        balance: {
          address: wallet.value.account.address || "",
        },
      });

      return Number(response.balance) / getTokenDecimals(tokenAddress.value);
    },
    enabled: isEnabled,
    initialData: 0,
    placeholderData: 0,
  });
}
