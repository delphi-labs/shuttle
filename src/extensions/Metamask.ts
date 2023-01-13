export interface Ethereum {
  isMetaMask?: boolean;
  request: (request: { method: string; params?: unknown[] | object }) => Promise<unknown>;
}
