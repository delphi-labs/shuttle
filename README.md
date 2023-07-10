# Shuttle

[![NPM version][npm-image]][npm-url]
[![Build][github-build]][github-build-url]
![npm-typescript]
[![License][github-license]][github-license-url]

Shuttle is an open-source npm package designed to turn wallet connections into a plug-and-play Lego brick for Cosmos dApps.

## Docs

You can check out the [documentation](https://shuttle.delphilabs.io/) for more information.

## Packages

## Packages

| Package                                                   | Version                                                                                                                                       | Size                                                                                                                                                             |
|-----------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [`@delphi-labs/shuttle`](packages/core)                   | [![npm](https://img.shields.io/npm/v/@delphi-labs/shuttle/beta.svg)](https://www.npmjs.com/package/@delphi-labs/shuttle/v/beta)               | [![minzip](https://img.shields.io/bundlephobia/minzip/@delphi-labs/shuttle/beta.svg)](https://bundlephobia.com/result?p=@delphi-labs/shuttle@beta)               |
| [`@delphi-labs/shuttle-react`](packages/react)            | [![npm](https://img.shields.io/npm/v/@delphi-labs/shuttle-react/beta.svg)](https://www.npmjs.com/package/@delphi-labs/shuttle-react/v/beta)   | [![minzip](https://img.shields.io/bundlephobia/minzip/@delphi-labs/shuttle-react/beta.svg)](https://bundlephobia.com/result?p=@delphi-labs/shuttle-react@beta)   |
| [`@delphi-labs/shuttle-vue`](packages/vue)                | [![npm](https://img.shields.io/npm/v/@delphi-labs/shuttle-vue/beta.svg)](https://www.npmjs.com/package/@delphi-labs/shuttle-vue/v/beta)       | [![minzip](https://img.shields.io/bundlephobia/minzip/@delphi-labs/shuttle-vue/beta.svg)](https://bundlephobia.com/result?p=@delphi-labs/shuttle-vue@beta)       |
| 


## How to get started

### Install

```bash
npm install @delphi-labs/shuttle
```

### Use

This is the core package of Shuttle, contains all the raw logic for connecting to wallets. If you want to use Shuttle in your dApp, you should use one of the framework-specific packages:

- @delphi-labs/shuttle-react
- @delphi-labs/shuttle-vue


## How to develop

### Install

```bash
pnpm install
```

### Local dev

```bash
pnpm run dev
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

[npm-url]: https://www.npmjs.com/package/@delphi-labs/shuttle
[npm-image]: https://img.shields.io/npm/v/@delphi-labs/shuttle
[npm-typescript]: https://img.shields.io/npm/types/@delphi-labs/shuttle
[github-license]: https://img.shields.io/github/license/delphi-labs/shuttle
[github-license-url]: https://github.com/delphi-labs/shuttle/blob/main/LICENSE
[github-build]: https://github.com/delphi-labs/shuttle/actions/workflows/publish.yml/badge.svg
[github-build-url]: https://github.com/delphi-labs/shuttle/actions/workflows/publish.yml
