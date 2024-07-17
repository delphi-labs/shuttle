import "./assets/main.css";

import { createApp } from "vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import {
  CosmostationExtensionProvider,
  CosmostationMobileProvider,
  KeplrExtensionProvider,
  KeplrMobileProvider,
  LeapCosmosExtensionProvider,
  LeapCosmosMobileProvider,
  MetamaskExtensionProvider,
  MetamaskMobileProvider,
  StationExtensionProvider,
  XDEFICosmosExtensionProvider,
  CitadelOneExtensionProvider,
  SafePalExtensionProvider,
  createShuttle,
} from "@delphi-labs/shuttle-vue";

import App from "./App.vue";
import router from "./router";
import {
  INJECTIVE_MAINNET,
  INJECTIVE_TESTNET,
  MARS_MAINNET,
  OSMOSIS_MAINNET,
  TERRA_MAINNET,
  TERRA_TESTNET,
} from "./config/networks";

export const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID;
const shuttle = createShuttle({
  pinia,
  walletConnectProjectId: WC_PROJECT_ID,
  extensionProviders: [
    new XDEFICosmosExtensionProvider({
      networks: [TERRA_MAINNET, TERRA_TESTNET, OSMOSIS_MAINNET, MARS_MAINNET],
    }),
    new CosmostationExtensionProvider({
      networks: [OSMOSIS_MAINNET, TERRA_MAINNET, TERRA_TESTNET, INJECTIVE_MAINNET, INJECTIVE_TESTNET],
    }),
    new LeapCosmosExtensionProvider({
      networks: [OSMOSIS_MAINNET, TERRA_MAINNET, TERRA_TESTNET, INJECTIVE_MAINNET, INJECTIVE_TESTNET],
    }),
    new StationExtensionProvider({
      networks: [OSMOSIS_MAINNET, MARS_MAINNET, TERRA_MAINNET, TERRA_TESTNET],
    }),
    new KeplrExtensionProvider({
      networks: [OSMOSIS_MAINNET, MARS_MAINNET, TERRA_MAINNET, TERRA_TESTNET, INJECTIVE_MAINNET, INJECTIVE_TESTNET],
    }),
    new MetamaskExtensionProvider({
      networks: [INJECTIVE_MAINNET, INJECTIVE_TESTNET],
    }),
    new CitadelOneExtensionProvider({
      networks: [OSMOSIS_MAINNET],
    }),
    new SafePalExtensionProvider({
      networks: [TERRA_MAINNET, INJECTIVE_MAINNET],
    }),
  ],
  mobileProviders: [
    new KeplrMobileProvider({
      networks: [OSMOSIS_MAINNET, MARS_MAINNET, TERRA_MAINNET, TERRA_TESTNET, INJECTIVE_MAINNET, INJECTIVE_TESTNET],
    }),
    new LeapCosmosMobileProvider({
      networks: [OSMOSIS_MAINNET, MARS_MAINNET, TERRA_MAINNET, TERRA_TESTNET, INJECTIVE_MAINNET, INJECTIVE_TESTNET],
    }),
    new CosmostationMobileProvider({
      networks: [TERRA_MAINNET, OSMOSIS_MAINNET, MARS_MAINNET],
    }),
    new MetamaskMobileProvider({
      networks: [INJECTIVE_MAINNET, INJECTIVE_TESTNET],
    }),
  ],
});

const app = createApp(App);

app.use(VueQueryPlugin);
app.use(pinia);
app.use(shuttle);
app.use(router);

app.mount("#app");
