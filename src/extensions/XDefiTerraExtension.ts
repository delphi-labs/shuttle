export default class XDefiTerraExtension {
  public async info(network: string): Promise<{
    focusedWalletAddress: string;
    isApproved: boolean;
    isConnectorExists: boolean;
    network: {
      name: string;
      chainID: string;
      lcd: string;
      fcd: string;
    };
    type: string;
    wallets: { design: string; name: string; terraAddress: string }[];
  }> {
    return this.request("info", network);
  }

  public async connect(network: string): Promise<string[]> {
    return this.request("connect", network);
  }

  public async post(
    network: string,
    address: string,
    messages: any[],
    fee?: string,
    gasPrices?: string,
    memo?: string,
  ): Promise<{
    code: number;
    codespace: string;
    gas_used: number;
    gas_wanted: number;
    height: number;
    logs: any[];
    raw_log: string;
    timestamp: string;
    txhash: string;
  }> {
    return this.request("post", network, {
      type: "post",
      from: address,
      msgs: messages,
      purgeQueue: true,
      waitForConfirmation: undefined,
      memo,
      fee,
      gasPrices,
      gasAdjustment: undefined,
      account_number: undefined,
      sequence: undefined,
    });
  }

  public async sign(
    network: string,
    address: string,
    messages: any[],
    fee?: string,
    gasPrices?: string,
    memo?: string,
  ): Promise<{
    id: string;
    msgs: string[];
    purgeQueue: boolean;
    result: {
      auth_info: {
        fee: { amount: { amount: string; denom: string }[]; gas_limit: string; granter: string; payer: string };
        signer_infos: { mode_info: any; public_key: { ["@type"]: string; key: string }; sequence: string }[];
      };
      body: { memo: string; messages: any[]; timeout_height: string };
      signatures: string[];
    };
    success: boolean;
  }> {
    return this.request("sign", network, {
      type: "sign",
      from: address,
      msgs: messages,
      purgeQueue: true,
      waitForConfirmation: true,
      memo,
      fee,
      gasPrices,
      gasAdjustment: undefined,
      account_number: undefined,
      sequence: undefined,
    });
  }

  private request(
    method: string,
    network: string,
    data: any = {},
    options: { timeout?: number } = { timeout: 30 },
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      let promiseData: any = null;
      const onMessage = (event: any) => {
        const message = event?.data;
        if (event.origin !== location.origin) return;
        if (event.source !== window) return;
        if (typeof message !== "object") return;
        if (message.target !== `xdefiinpage`) return;
        if (!message.data || !message.data.data) return;

        if ("result" in message.data.data) {
          promiseData = message.data.data.result;
        }
      };
      window.addEventListener("message", onMessage);
      const id = new Date().getTime();

      window.postMessage(
        {
          target: "xdeficontentscript",
          data: {
            name: "xdefiprovider",
            data: {
              chainId: "terra",
              network,
              origin: undefined,
              raw: { id, method, params: { ...data, id } },
              time: new Date().getTime(),
              xdefiId: id,
            },
          },
        },
        location.origin,
      );
      let tries = 0;
      const interval = setInterval(() => {
        if (tries > ((options.timeout || 15) * 1000) / 200) {
          reject("Timeout reached");
          clearInterval(interval);
          return;
        }
        if (promiseData) {
          resolve(promiseData);
          window.removeEventListener("message", onMessage);
          clearInterval(interval);
        }
        tries++;
      }, 200);
    });
  }
}
