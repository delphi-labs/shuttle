import { useQuery } from "@tanstack/react-query";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";

import { getTokenDecimals } from "@/config/tokens";
import useWallet from "./useWallet";

export default function useBalance(tokenAddress: string) {
  const wallet = useWallet();

  return useQuery(
    ["balance", wallet?.id, tokenAddress],
    async () => {
      if (!wallet || !tokenAddress) {
        return 0;
      }

      const client = await CosmWasmClient.connect(wallet?.network.rpc || "");

      if (tokenAddress.startsWith("u") || tokenAddress === "inj" || tokenAddress.startsWith("ibc/")) {
        const response = await client.getBalance(wallet?.account.address || "", tokenAddress);
        return Number(response.amount) / getTokenDecimals(tokenAddress);
      }

      const response = await client.queryContractSmart(tokenAddress, {
        balance: {
          address: wallet?.account.address || "",
        },
      });

      return Number(response.balance) / getTokenDecimals(tokenAddress);
    },
    {
      enabled: !!wallet && !!tokenAddress,
      initialData: 0,
      placeholderData: 0,
    },
  );
}
