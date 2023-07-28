import type { Network } from "../../internals/network";
import Station, { type StationWindow } from "../../internals/adapters/extensions/Station";
import WalletExtensionProvider from "./WalletExtensionProvider";

declare global {
  interface Window {
    station?: StationWindow;
  }
}

export const StationExtensionProvider = class StationExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "station",
      name: "Station",
      networks,
      extensionProviderAdapter: new Station({
        extensionResolver() {
          return window.station;
        },
        setupOnUpdateEventListener(callback) {
          window.addEventListener("station_wallet_change", () => {
            callback?.();
          });
        },
      }),
    });
  }
};

export default StationExtensionProvider;
