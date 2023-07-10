import { SimulateResult, TransactionMsg, useShuttle } from "@delphi-labs/shuttle-react";
import { useQuery } from "@tanstack/react-query";

import useWallet from "./useWallet";

type Props = {
  messages: TransactionMsg[];
};

export default function useFeeEstimate({ messages }: Props) {
  const { simulate } = useShuttle();
  const wallet = useWallet();

  return useQuery(
    ["fee-estimate", JSON.stringify(messages), wallet?.id],
    async () => {
      if (!messages || messages.length <= 0 || !wallet) {
        return null;
      }

      const response: SimulateResult = await simulate({
        messages,
        wallet,
      });

      return {
        fee: response.fee?.amount[0],
        gasLimit: response.fee?.gas,
      };
    },
    {
      enabled: !!messages && messages.length > 0 && !!wallet,
    },
  );
}
