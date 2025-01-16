<script lang="ts" setup>
import { ref } from "vue";
import { EthSignType, useShuttle } from "@delphi-labs/shuttle-vue";

import useWallet from "@/composables/useWallet";

const shuttle = useShuttle();
const wallet = useWallet();

const data = ref("");

function onSign() {
  shuttle
    .signEthereum({
      wallet: wallet.value,
      data: data.value,
      type: EthSignType.MESSAGE,
    })
    .then(async (result) => {
      console.log("sign ethereum result", result);
    })
    .catch((error) => {
      console.error("sign ethereum error", error);
    });
}
</script>

<template>
  <h2>Sign Ethereum</h2>
  <textarea v-model="data" :style="{ width: '450px', height: '100px' }" />
  <button @click="() => onSign()">Sign</button>
</template>
