import SignClient from "@walletconnect/sign-client";

declare global {
  // eslint-disable-next-line no-var
  var walletConnect: SignClient | null;
  // eslint-disable-next-line no-var
  var initializingWalletConnect: boolean;
}

globalThis.walletConnect = null;
globalThis.initializingWalletConnect = false;
export async function setupWalletConnect(walletConnectProjectId: string) {
  if (globalThis.walletConnect) {
    return globalThis.walletConnect;
  }

  if (globalThis.initializingWalletConnect) {
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (globalThis.walletConnect) {
          clearInterval(interval);
          resolve(globalThis.walletConnect);
        }
      }, 100);
    });
    return globalThis.walletConnect as unknown as SignClient;
  }

  globalThis.initializingWalletConnect = true;
  console.log("init walletConnect");
  globalThis.walletConnect = await SignClient.init({
    projectId: walletConnectProjectId,
  });
  globalThis.initializingWalletConnect = false;
  return globalThis.walletConnect;
}
