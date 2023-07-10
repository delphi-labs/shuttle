<script lang="ts" setup>
import { computed, ref, watchEffect } from 'vue'
import { useShuttle } from '@delphi-labs/shuttle-vue'

import { useShuttlePortStore } from '@/stores/shuttle-port'
import { POOLS } from '@/config/pools'
import { DEFAULT_TOKEN_DECIMALS, TOKENS } from '@/config/tokens'
import { fromNetworkToNativeSymbol } from '@/config/networks'
import useWallet from '@/composables/useWallet'
import useBalance from '@/composables/useBalance'
import useSwap from '@/composables/useSwap'
import useFeeEstimate from '@/composables/useFeeEstimate'
import BigNumber from 'bignumber.js'

const shuttle = useShuttle()
const shuttlePortStore = useShuttlePortStore()
const wallet = useWallet()

const pools = computed(() => {
  return POOLS[shuttlePortStore.currentNetworkId]
})

const poolAddress = computed(() => {
  return pools.value.astroNative
})

const tokens = computed(() => {
  return TOKENS[shuttlePortStore.currentNetworkId]
})

const token1 = ref<string>(tokens.value.native)
const token2 = ref<string>(tokens.value.astro)

watchEffect(() => {
  token1.value = tokens.value.native
  token2.value = tokens.value.astro
})

const token1Amount = ref<string>('0')
// const token2Amount = ref<string>('0');

const token1Balance = useBalance(token1)
const token2Balance = useBalance(token2)

const swap = useSwap(token1Amount, token1, token2, poolAddress)

const { data: swapFeeEstimate } = useFeeEstimate(swap.msgs)

const isSwapping = ref<boolean>(false)
async function onSubmit() {
  isSwapping.value = true

  shuttle
    .broadcast({
      wallet: wallet.value,
      messages: swap.msgs.value,
      feeAmount: swapFeeEstimate.value?.fee?.amount,
      gasLimit: swapFeeEstimate.value?.gasLimit
    })
    .then((result) => {
      console.log('result', result)
      token1Balance.refetch()
      token2Balance.refetch()
    })
    .catch((error) => {
      console.error('Broadcast error', error)
    })
    .finally(() => {
      isSwapping.value = false
      token1Amount.value = '0'
    })
}
</script>

<template>
  <h2>Swap</h2>

  <p v-if="!poolAddress">Pool not found.</p>
  <template v-else>
    <div>
      <select
        :value="token1"
        @change="($event) => {
            const token = ($event.target as HTMLInputElement).value;
            if (token !== token1) {
              token2 = token1;
              token1 = token;
            }
          }"
      >
        <option :value="tokens.native">
          {{ fromNetworkToNativeSymbol(shuttlePortStore.currentNetworkId) }}
        </option>
        <option :value="tokens.astro">ASTRO</option>
      </select>
      <input v-model="token1Amount" />
      <p>Balance: {{ token1Balance.data }}</p>
    </div>
    <div>
      <select
        :value="token2"
        @change="($event) => {
            const token = ($event.target as HTMLInputElement).value;
            if (token !== token2) {
              token1 = token2;
              token2 = token;
            }
          }"
      >
        <option :value="tokens.native">
          {{ fromNetworkToNativeSymbol(shuttlePortStore.currentNetworkId) }}
        </option>
        <option :value="tokens.astro">ASTRO</option>
      </select>
      <input :value="swap.simulate.data.value?.amount || '0'" disabled />
      <p>Balance: {{ token2Balance.data }}</p>
    </div>
    <div>
      <button @click="onSubmit" :disabled="isSwapping || !(swapFeeEstimate && swapFeeEstimate.fee)">
        {{ isSwapping ? 'Processing...' : 'Swap' }}
      </button>
      <p v-if="swapFeeEstimate && swapFeeEstimate.fee">
        Fee: {{ BigNumber(swapFeeEstimate.fee.amount).div(DEFAULT_TOKEN_DECIMALS || 1).toString() }} {{ swapFeeEstimate.fee.denom }}
      </p>
    </div>
  </template>
</template>
