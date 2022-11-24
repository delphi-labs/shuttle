export type CosmosMsg = {
  typeUrl: string;
  value: any;
};

export class TransactionMsg<T = any> {
  constructor(public typeUrl: string, public value: T) {}

  toCosmosMsg(): CosmosMsg {
    return {
      typeUrl: this.typeUrl,
      value: this.value,
    };
  }

  toTerraExtensionMsg(): string {
    return JSON.stringify({
      "@type": this.typeUrl,
      ...this.value,
    });
  }
}

export default TransactionMsg;
