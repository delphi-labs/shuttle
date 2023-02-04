export type CosmosMsg = {
  typeUrl: string;
  value: any;
};

export type AminoMsg<T = any> = {
  type: string;
  value: T;
};

export type ProtoMsg = {
  typeUrl: string;
  value: Uint8Array;
};

export class TransactionMsg<T = any> {
  static TYPE: string;

  constructor(public typeUrl: string, public value: T) {}

  toCosmosMsg(): CosmosMsg {
    return {
      typeUrl: this.typeUrl,
      value: this.value,
    };
  }

  toAminoMsg(): AminoMsg<T> {
    return {
      type: this.typeUrl,
      value: this.value,
    };
  }

  toProtoMsg(): ProtoMsg {
    return {
      typeUrl: this.typeUrl,
      value: new Uint8Array(),
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
