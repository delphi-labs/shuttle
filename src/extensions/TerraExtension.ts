export default class TerraExtension {
  identifier: string = "station";

  constructor(identifier?: string) {
    if (identifier) {
      this.identifier = identifier;
    }
  }

  public init(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const onMessage = (event: any) => {
          const message = event?.data;
          if (event.origin !== location.origin) return;
          if (event.source !== window) return;
          if (typeof message !== "object") return;
          if (message.target !== `${this.identifier}:inpage`) return;
          if (!message.data) return;

          if (message.data === "ACK") {
            window.postMessage({ target: `${this.identifier}:content`, data: "ACK" }, location.origin);
            resolve();
          }
        };
        window.addEventListener("message", onMessage);
        window.postMessage({ target: `${this.identifier}:content`, data: "SYN" }, location.origin);
      } catch (error) {
        reject(error);
      }
    });
  }

  public async info(): Promise<{
    api: string;
    chainID: string;
    hive: string;
    lcd: string;
    name: string;
    walletconnectID: string;
  }> {
    return this.request("info");
  }

  public async connect(): Promise<{ address: string }> {
    const response = await this.request("connect");
    return {
      address: response.address,
    };
  }

  public async post(
    messages: any[],
    fee?: string,
    memo?: string,
  ): Promise<{
    id: string;
    msgs: string[];
    purgeQueue: boolean;
    result: { height: number; raw_log: string; txhash: string };
    success: boolean;
  }> {
    return this.request("post", { msgs: messages, purgeQueue: true, waitForConfirmation: true, memo, fee });
  }

  public async sign(
    messages: any[],
    fee?: string,
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
    return this.request("sign", { msgs: messages, purgeQueue: true, memo, fee });
  }

  private request(type: string, data: any = {}, options: { timeout?: number } = { timeout: 30 }): Promise<any> {
    return new Promise((resolve, reject) => {
      let promiseData: any = null;
      const onMessage = (event: any) => {
        const message = event?.data;
        if (event.origin !== location.origin) return;
        if (event.source !== window) return;
        if (typeof message !== "object") return;
        if (message.target !== `${this.identifier}:inpage`) return;
        if (!message.data) return;

        if (message.data.name === `on${[type[0].toUpperCase(), type.slice(1)].join("")}`) {
          promiseData = message.data.payload;
        }
      };
      window.addEventListener("message", onMessage);
      const id = new Date().getTime();
      window.postMessage({ target: `${this.identifier}:content`, data: { id, type, ...data } }, location.origin);
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
