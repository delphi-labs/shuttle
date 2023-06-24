import type { Network } from "../../internals/network";
import Station, { StationExtension } from "../../internals/adapters/extensions/Station";
import WalletExtensionProvider from "./WalletExtensionProvider";

export const StationExtensionProvider = class StationExtensionProvider extends WalletExtensionProvider {
  constructor({ networks }: { networks: Network[] }) {
    super({
      id: "station",
      name: "Station",
      networks,
      extensionProviderAdapter: new Station({
        extensionResolver() {
          return new StationExtension("station");
        },
        setupOnUpdateEventListener(callback) {
          window.addEventListener("station_wallet_change", () => {
            callback?.();
          });

          window.addEventListener("station_network_change", () => {
            callback?.();
          });
        },
      }),
    });
  }
};

export const StationProvider = StationExtensionProvider;
export const TerraStationProvider = StationExtensionProvider;

export default StationExtensionProvider;
