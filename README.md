# Shuttle

[![NPM version][npm-image]][npm-url]
[![Build][github-build]][github-build-url]
![npm-typescript]
[![License][github-license]][github-license-url]

Shuttle is open-source npm package designed to turn wallet connections into a plug-and-play Lego brick for Cosmos dApps.

## Docs

You can check out the [documentation](https://shuttle.delphilabs.io/) for more information.

## How to get started

### Install

```bash
npm install @delphi-labs/shuttle
```

### Setup

```tsx
import { ShuttleProvider } from "@delphi-labs/shuttle";

const providers = [
  // ...
];

const mobileProviders = [
  // ...
];

function App() {
  return (
    <ShuttleProvider
      providers={providers}
      mobileProviders={mobileProviders}
      // Add the following prop if you want wallet connections
      // to be persisted to local storage.
      persistent
    >
      <Component {...pageProps} />
    </ShuttleProvider>
  );
}
```

### Use

```tsx
import { useState } from "react";
import QRCode from "react-qr-code";
import { useShuttle, isAndroid, isIOS, isMobile } from "@delphi-labs/shuttle";

const currentNetworkId = "mars-1";

function Header() {
  const { providers, connect, mobileProviders, mobileConnect, getWallets } = useShuttle();
  const [walletconnectUrl, setWalletconnectUrl] = useState("");
  const wallet = getWallets({ chainId: currentNetworkId })[0];

  return (<>
      {wallet && (
        <>
          <p>Address: {wallet.account.address}</p>
        </>
      )}

    {!wallet && (<>
      {providers.map((provider) => {
        return (
          <button
            key={provider.id}
            onClick={() =>
              connect({
                providerId: provider.id,
                chainId: currentNetworkId,
              })
            }
            disabled={!provider.initialized}
          >
            {provider.name}
          </button>
        );
      })}

      {mobileProviders.map((mobileProvider) => {
        return (
          <button
            key={mobileProvider.id}
            onClick={async () => {
              const urls = await mobileConnect({
                mobileProviderId: mobileProvider.id,
                chainId: currentNetworkId,
                callback: () => {
                  setWalletconnectUrl("");
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
                setWalletconnectUrl(urls.walletconnectUrl);
              }
            }}
            disabled={!mobileProvider.initialized}
          >
            {mobileProvider.name}
          </button>
        );
      })}

      {walletconnectUrl && (
        <>
          <QRCode value={walletconnectUrl} />
        </>
      )}
    </>)}
  </>);
}
```

## How to develop

### Install

```bash
npm install
```

### Test

```bash
npm run test
```

### Prettier

```bash
npm run prettier
```

### Lint

```bash
npm run lint
```

### Build

```bash
npm run build
```

### Publish

```bash
npm publish
```

[npm-url]: https://www.npmjs.com/package/@delphi-labs/shuttle
[npm-image]: https://img.shields.io/npm/v/@delphi-labs/shuttle
[npm-typescript]: https://img.shields.io/npm/types/@delphi-labs/shuttle
[github-license]: https://img.shields.io/github/license/delphi-labs/shuttle
[github-license-url]: https://github.com/delphi-labs/shuttle/blob/main/LICENSE
[github-build]: https://github.com/delphi-labs/shuttle/actions/workflows/publish.yml/badge.svg
[github-build-url]: https://github.com/delphi-labs/shuttle/actions/workflows/publish.yml
