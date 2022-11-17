# Shuttle

[![NPM version][npm-image]][npm-url]
[![Build][github-build]][github-build-url]
![npm-typescript]
[![License][github-license]][github-license-url]

Shuttle is open-source npm package designed to turn wallet connections into a plug-and-play Lego™ brick for Cosmos Dapps.

## Docs

You can check out the [documentation](https://shuttle.delphilabs.io/) for more information.

## How to get started

### Install

```bash
npm install @delphilabs/shuttle
```

### Setup

```tsx
import { ShuttleProvider } from "@delphilabs/shuttle";

function App() {
  return <ShuttleProvider
    providers={[
      // ...
    ]}
    // Add the following prop if you want wallet connections
    // to be persisted to local storage.
    persistent
  >
    <Component />
  </ShuttleProvider>
}
```

### Use

```tsx
import { useShuttle } from "@delphilabs/shuttle";

function App() {
  const { connect, recentWallet, disconnect } = useShuttle();
   
  return <>
    {!recentWallet && (<button onClick={() => connect("keplr", "mars-1")}>Connect</button>)}
    {recentWallet && (
      <>
        <h2>Recent Wallet</h2>
        <p>ID: {recentWallet.id}</p>
        <p>Provider ID: {recentWallet.providerId}</p>
        <p>Chain ID: {recentWallet.network.chainId}</p>
        <p>Address: {recentWallet.account.address}</p>
        <button onClick={disconnect}>Disconnect</button>
      </>
    )}
  </>
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

[npm-url]: https://www.npmjs.com/package/@delphilabs/shuttle
[npm-image]: https://img.shields.io/npm/v/@delphilabs/shuttle
[npm-typescript]: https://img.shields.io/npm/types/@delphilabs/shuttle
[github-license]: https://img.shields.io/github/license/delphidigital/shuttle
[github-license-url]: https://github.com/delphidigital/shuttle/blob/main/LICENSE
[github-build]: https://github.com/delphidigital/shuttle/actions/workflows/publish.yml/badge.svg
[github-build-url]: https://github.com/delphidigital/shuttle/actions/workflows/publish.yml
