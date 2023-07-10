"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { useShuttle, isAndroid, isIOS, isMobile } from "@delphi-labs/shuttle-react";

import { networks } from "@/config/networks";
import { useShuttlePortStore } from "@/config/store";
import useWallet from "@/hooks/useWallet";

export default function Header() {
  const [currentNetworkId, switchNetwork] = useShuttlePortStore((state) => [
    state.currentNetworkId,
    state.switchNetwork,
  ]);
  const { connect, mobileConnect, disconnectWallet, extensionProviders, mobileProviders } = useShuttle();
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const wallet = useWallet();

  return (
    <>
      <header>
        <h1>Shuttle Port (React)</h1>

        <hr />

        <div>
          <label htmlFor="currentNetwork">Current network:</label>
          <select id="currentNetwork" onChange={(e) => switchNetwork(e.target.value)} value={currentNetworkId}>
            {networks.map((network) => (
              <option key={network.chainId} value={network.chainId}>
                {network.name}
              </option>
            ))}
          </select>
        </div>

        <hr />

        {!wallet && (
          <div>
            {extensionProviders.map((extensionProvider) => {
              if (!extensionProvider.networks.has(currentNetworkId)) return;

              return (
                <button
                  key={extensionProvider.id}
                  onClick={() =>
                    connect({
                      extensionProviderId: extensionProvider.id,
                      chainId: currentNetworkId,
                    })
                  }
                  disabled={!extensionProvider.initialized}
                >
                  {extensionProvider.name}
                </button>
              );
            })}
            {mobileProviders.map((mobileProvider) => {
              if (!mobileProvider.networks.has(currentNetworkId)) return;

              return (
                <button
                  key={mobileProvider.id}
                  onClick={async () => {
                    const urls = await mobileConnect({
                      mobileProviderId: mobileProvider.id,
                      chainId: currentNetworkId,
                      callback: () => {
                        setQrCodeUrl("");
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
                      setQrCodeUrl(urls.qrCodeUrl);
                    }
                  }}
                  disabled={!mobileProvider.initialized}
                >
                  {mobileProvider.name}
                </button>
              );
            })}
          </div>
        )}

        {wallet && (
          <div>
            <p>Address: {wallet.account.address}</p>
            <button onClick={() => disconnectWallet(wallet)}>Disconnect</button>
          </div>
        )}

        <hr />
      </header>

      {qrCodeUrl && (
        <div className="fixed inset-0 flex flex-col items-center justify-center">
          <div className="absolute inset-0 z-0 bg-black opacity-20" onClick={() => setQrCodeUrl("")}></div>
          <div className="relative flex min-h-[408px] min-w-[384px] flex-col items-center rounded-lg bg-white py-10 px-14 shadow-md">
            <button
              className="absolute top-3 right-3 rounded bg-black p-1.5 text-white"
              onClick={() => setQrCodeUrl("")}
            >
              Close
            </button>

            <h2 className="mb-2 text-xl">Wallet Connect</h2>

            <div className="flex flex-col items-center">
              <p className="mb-4 text-center text-sm text-gray-600">Scan this QR code with your mobile wallet</p>
              <QRCode value={qrCodeUrl} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
