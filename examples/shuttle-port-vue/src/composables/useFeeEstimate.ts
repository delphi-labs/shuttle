import { Ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { SimulateResult, TransactionMsg, useShuttle } from '@delphi-labs/shuttle-vue'

import useWallet from './useWallet'

export default function useFeeEstimate(messages: Ref<TransactionMsg[]>) {
  const shuttle = useShuttle()
  const wallet = useWallet()

  const isEnabled = computed(() => {
    return !!messages.value && messages.value.length > 0 && !!wallet.value
  })

  return useQuery({
    queryKey: ['fee-estimate', messages, wallet],
    queryFn: async () => {
      if (!messages.value || messages.value.length <= 0 || !wallet.value) {
        return null
      }

      console.log('messages.value', messages.value)
      const response: SimulateResult = await shuttle.simulate({
        messages: messages.value,
        wallet: wallet.value
      })

      return {
        fee: response.fee?.amount[0],
        gasLimit: response.fee?.gas
      }
    },
    enabled: isEnabled,
    staleTime: Infinity
  })
}
