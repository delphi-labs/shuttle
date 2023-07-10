import { defineComponent } from "vue";
import { createPinia } from "pinia";
import { mount } from "@vue/test-utils";

import { createShuttle, useShuttle } from "../src/plugin";

test("it installs the plugin", async () => {
  const pinia = createPinia();
  const shuttle = createShuttle({ pinia });

  const TestComponent = defineComponent({
    template: '<span id="provide-test">{{wallet.account.address}}</span>',
    setup() {
      const shuttle = useShuttle();
      shuttle.$store.addWallet({
        id: "test",
        providerId: "test",
        account: {
          address: "cosmos1",
          algo: null,
          pubkey: null,
        },
        network: {
          chainId: "testnet",
          name: "Testnet",
          rpc: "https://rpc.testnet.cosmos.network:443",
          rest: "https://lcd.testnet.cosmos.network:443",
        },
        mobileSession: {},
      });

      return { wallet: shuttle.$store.recentWallet };
    },
  });

  const wrapper = mount(TestComponent, {
    global: {
      plugins: [pinia, shuttle],
    },
  });

  expect(wrapper.find("#provide-test").text()).toBe("cosmos1");
});
