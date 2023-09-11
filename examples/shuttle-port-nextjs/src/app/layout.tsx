"use client";

import {
  CosmostationExtensionProvider,
  KeplrExtensionProvider,
  LeapCosmosExtensionProvider,
  MetamaskExtensionProvider,
  StationExtensionProvider,
  XDEFICosmosExtensionProvider,
  CosmostationMobileProvider,
  KeplrMobileProvider,
  LeapCosmosMobileProvider,
  LeapMetamaskCosmosSnapExtensionProvider,
  MetamaskMobileProvider,
  ShuttleProvider,
} from "@delphi-labs/shuttle-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  OSMOSIS_MAINNET,
  MARS_MAINNET,
  TERRA_MAINNET,
  TERRA_TESTNET,
  INJECTIVE_MAINNET,
  INJECTIVE_TESTNET,
  NEUTRON_MAINNET,
  NEUTRON_TESTNET,
} from "@/config/networks";
import Header from "@/components/Header";

import "./globals.css";

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

const extensionProviders = [
  new XDEFICosmosExtensionProvider({
    networks: [TERRA_MAINNET, TERRA_TESTNET, OSMOSIS_MAINNET, MARS_MAINNET],
  }),
  new CosmostationExtensionProvider({
    networks: [
      OSMOSIS_MAINNET,
      TERRA_MAINNET,
      TERRA_TESTNET,
      INJECTIVE_MAINNET,
      INJECTIVE_TESTNET,
      NEUTRON_MAINNET,
      NEUTRON_TESTNET,
    ],
  }),
  new LeapCosmosExtensionProvider({
    networks: [OSMOSIS_MAINNET, TERRA_MAINNET, TERRA_TESTNET, INJECTIVE_MAINNET, INJECTIVE_TESTNET],
  }),
  new LeapMetamaskCosmosSnapExtensionProvider({
    networks: [
      OSMOSIS_MAINNET,
      MARS_MAINNET,
      TERRA_MAINNET,
      TERRA_TESTNET,
      INJECTIVE_MAINNET,
      INJECTIVE_TESTNET,
      NEUTRON_MAINNET,
      NEUTRON_TESTNET,
    ],
  }),
  new StationExtensionProvider({
    networks: [OSMOSIS_MAINNET, MARS_MAINNET, TERRA_MAINNET, TERRA_TESTNET],
  }),
  new KeplrExtensionProvider({
    networks: [
      OSMOSIS_MAINNET,
      MARS_MAINNET,
      TERRA_MAINNET,
      TERRA_TESTNET,
      INJECTIVE_MAINNET,
      INJECTIVE_TESTNET,
      NEUTRON_MAINNET,
      NEUTRON_TESTNET,
    ],
  }),
  new MetamaskExtensionProvider({
    networks: [INJECTIVE_MAINNET, INJECTIVE_TESTNET],
  }),
];

const mobileProviders = [
  new KeplrMobileProvider({
    networks: [
      OSMOSIS_MAINNET,
      MARS_MAINNET,
      TERRA_MAINNET,
      TERRA_TESTNET,
      INJECTIVE_MAINNET,
      INJECTIVE_TESTNET,
      NEUTRON_MAINNET,
      NEUTRON_TESTNET,
    ],
  }),
  new LeapCosmosMobileProvider({
    networks: [OSMOSIS_MAINNET, MARS_MAINNET, TERRA_MAINNET, TERRA_TESTNET, INJECTIVE_MAINNET, INJECTIVE_TESTNET],
  }),
  new CosmostationMobileProvider({
    networks: [TERRA_MAINNET, OSMOSIS_MAINNET, MARS_MAINNET, NEUTRON_MAINNET, NEUTRON_TESTNET],
  }),
  new MetamaskMobileProvider({
    networks: [INJECTIVE_MAINNET, INJECTIVE_TESTNET],
  }),
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();

  return (
    <html lang="en">
      <body>
        <ShuttleProvider
          walletConnectProjectId={WC_PROJECT_ID}
          mobileProviders={mobileProviders}
          extensionProviders={extensionProviders}
          persistent
        >
          <QueryClientProvider client={queryClient}>
            <Header />
            {children}
          </QueryClientProvider>
        </ShuttleProvider>
      </body>
    </html>
  );
}
