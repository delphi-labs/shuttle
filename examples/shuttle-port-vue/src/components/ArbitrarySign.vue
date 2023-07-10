<script lang="ts" setup>
import { Buffer } from 'buffer';
import { ref } from 'vue';
import { useShuttle } from '@delphi-labs/shuttle-vue';

import useWallet from '@/composables/useWallet';

const shuttle = useShuttle();
const wallet = useWallet();

const data = ref('')

function onSign() {
  const bytes = Buffer.from(data.value, "utf-8");
  shuttle.signArbitrary({
    wallet: wallet.value,
    data: bytes,
  })
    .then(async (result) => {
      console.log("sign arbitrary result", result);

      console.group("###### verifying signature.... ########");
      const verification = await shuttle.verifyArbitrary({
        wallet: wallet.value,
        data: bytes,
        signResult: result,
      });
      console.log("verification result:", verification);
      console.log("####################################");
      console.groupEnd();
    })
    .catch((error) => {
      console.error("sign arbitrary error", error);
    });
}
</script>

<template>
    <h2>Sign arbitrary</h2>
    <textarea v-model="data" :style="{'width': '450px', 'height': '100px'}" />
    <button @click="() => onSign()">Sign</button>
</template>