# Shuttle (Vue)

[![NPM version][npm-image]][npm-url]
[![Build][github-build]][github-build-url]
![npm-typescript]
[![License][github-license]][github-license-url]

Shuttle is an open-source npm package designed to turn wallet connections into a plug-and-play Lego brick for Cosmos dApps.

## Docs

You can check out the [documentation](https://shuttle.delphilabs.io/) for more information.

## How to get started

### Install

```bash
npm install @delphi-labs/shuttle-vue
```

### Setup

```ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { createShuttle } from "@delphi-labs/shuttle-vue";

import App from "./App.vue";

export const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

const shuttle = createShuttle({
  pinia,
  walletConnectProjectId: "...",
  extensionProviders: [
    // ...
  ],
  mobileProviders: [
    // ...
  ],
});

const app = createApp(App);

app.use(pinia);
app.use(shuttle);

app.mount("#app");
```

### Use

```vue
<script lang="ts" setup>
import { ref } from "vue";
import { WalletConnection, isAndroid, isIOS, isMobile, useShuttle } from "@delphi-labs/shuttle-vue";
import QrcodeVue from "qrcode.vue";

import { useShuttlePortStore } from "@/stores/shuttle-port";
import { networks } from "@/config/networks";
import useWallet from "@/composables/useWallet";

const shuttle = useShuttle();
const networkStore = useShuttlePortStore();
const wallet = useWallet();

async function connect(extensionProviderId: string) {
  await shuttle.connect({ extensionProviderId: extensionProviderId, chainId: networkStore.currentNetworkId });
}

const qrcodeUrl = ref<string | null>(null);

async function mobileConnect(mobileProviderId: string) {
  const urls = await shuttle.mobileConnect({
    mobileProviderId: mobileProviderId,
    chainId: networkStore.currentNetworkId,
    callback: () => {
      qrcodeUrl.value = null;
    },
  });

  if (isMobile()) {
    if (isAndroid()) {
      window.location.href = urls.androidUrl;
    } else if (isIOS()) {
      window.location.href = urls.iosUrl;
    } else {
      window.location.href = urls.androidUrl;
    }
  } else {
    qrcodeUrl.value = urls.qrCodeUrl;
  }
}

function disconnectWallet(wallet: WalletConnection) {
  shuttle.disconnectWallet(wallet);
}
</script>

<template>
  <header>
    <h1>Shuttle Port (Vue)</h1>

    <hr />

    <div>
      <label htmlFor="currentNetwork">Current network:</label>
      <select
        id="currentNetwork"
        :value="networkStore.currentNetworkId"
        @change="networkStore.switchNetwork(($event.target as HTMLInputElement).value)"
      >
        <option v-for="network in networks" :key="network.chainId" :value="network.chainId">{{ network.name }}</option>
      </select>
    </div>

    <hr />

    <div v-if="!wallet">
      <button
        v-for="extensionProvider in shuttle.extensionProviders.filter((provider) =>
          provider.networks.has(networkStore.currentNetworkId),
        )"
        :key="extensionProvider.id"
        @click="() => connect(extensionProvider.id)"
        :disabled="!shuttle.availableExtensionProviders.find((p) => p.id === extensionProvider.id)"
      >
        {{ extensionProvider.name }}
      </button>
      <button
        v-for="mobileProvider in shuttle.mobileProviders.filter((provider) =>
          provider.networks.has(networkStore.currentNetworkId),
        )"
        :key="mobileProvider.id"
        @click="() => mobileConnect(mobileProvider.id)"
        :disabled="!shuttle.availableMobileProviders.find((p) => p.id === mobileProvider.id)"
      >
        {{ mobileProvider.name }}
      </button>
    </div>
    <div v-else>
      <div>
        <p>Address: {{ wallet.account.address }}</p>
        <button @click="() => disconnectWallet(wallet!)">Disconnect</button>
      </div>
    </div>
    <hr />
  </header>

  <div v-if="qrcodeUrl" className="fixed inset-0 flex flex-col items-center justify-center">
    <div className="absolute inset-0 z-0 bg-black opacity-20" @click="qrcodeUrl = null"></div>
    <div
      className="relative flex min-h-[408px] min-w-[384px] flex-col items-center rounded-lg bg-white py-10 px-14 shadow-md"
    >
      <button className="absolute top-3 right-3 rounded bg-black p-1.5 text-white" @click="qrcodeUrl = null">
        Close
      </button>

      <h2 className="mb-2 text-xl">Wallet Connect</h2>

      <div className="flex flex-col items-center">
        <p className="mb-4 text-center text-sm text-gray-600">Scan this QR code with your mobile wallet</p>
        <QrcodeVue :value="qrcodeUrl" :size="250" />
      </div>
    </div>
  </div>
</template>
```

## How to develop

### Install

```bash
pnpm install
```

### Test

```bash
pnpm run test
```

### Prettier

```bash
pnpm run prettier
```

### Lint

```bash
pnpm run lint
```

### Build

```bash
pnpm run build
```

### Publish

```bash
pnpm publish
```

[npm-url]: https://www.npmjs.com/package/@delphi-labs/shuttle-vue
[npm-image]: https://img.shields.io/npm/v/@delphi-labs/shuttle-vue
[npm-typescript]: https://img.shields.io/npm/types/@delphi-labs/shuttle-vue
[github-license]: https://img.shields.io/github/license/delphi-labs/shuttle
[github-license-url]: https://github.com/delphi-labs/shuttle/blob/main/LICENSE
[github-build]: https://github.com/delphi-labs/shuttle/actions/workflows/publish.yml/badge.svg
[github-build-url]: https://github.com/delphi-labs/shuttle/actions/workflows/publish.yml
