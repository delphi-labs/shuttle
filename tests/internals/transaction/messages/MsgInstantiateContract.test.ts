import { toUtf8 } from "@cosmjs/encoding";
import { CosmosMsg, MsgInstantiateContract } from "../../../../src";
import { AminoMsg } from "@cosmjs/amino";

describe("MsgInstantiateContract", () => {
  test("it returns the correct typeUrl", () => {
    const msg = new MsgInstantiateContract({
      sender: "address1",
      admin: "address2",
      codeId: "10",
      label: "New contract",
      msg: {
        swap: {
          offer_asset: {
            info: {
              native_token: {
                denom: "uastrod",
              },
            },
            amount: "1000000",
          },
        },
      },
      funds: [{ amount: "1000000", denom: "uastrod" }],
    });

    expect(msg.typeUrl).toEqual("/cosmwasm.wasm.v1.MsgInstantiateContract");
  });

  test("it returns the correct aminoTypeUrl", () => {
    const msg = new MsgInstantiateContract({
      sender: "address1",
      admin: "address2",
      codeId: "10",
      label: "New contract",
      msg: {
        swap: {
          offer_asset: {
            info: {
              native_token: {
                denom: "uastrod",
              },
            },
            amount: "1000000",
          },
        },
      },
      funds: [{ amount: "1000000", denom: "uastrod" }],
    });

    expect(msg.aminoTypeUrl).toEqual("wasm/MsgInstantiateContract");
  });

  test("it converts to CosmosMsg", () => {
    const msg = new MsgInstantiateContract({
      sender: "address1",
      admin: "address2",
      codeId: "10",
      label: "New contract",
      msg: {
        swap: {
          offer_asset: {
            info: {
              native_token: {
                denom: "uastrod",
              },
            },
            amount: "1000000",
          },
        },
      },
      funds: [{ amount: "1000000", denom: "uastrod" }],
    });

    const cosmosMsg: CosmosMsg = msg.toCosmosMsg();

    expect(cosmosMsg).toEqual({
      typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContract",
      value: {
        sender: "address1",
        admin: "address2",
        codeId: "10",
        label: "New contract",
        msg: toUtf8(
          JSON.stringify({
            swap: {
              offer_asset: {
                info: {
                  native_token: {
                    denom: "uastrod",
                  },
                },
                amount: "1000000",
              },
            },
          }),
        ),
        funds: [{ amount: "1000000", denom: "uastrod" }],
      },
    });
  });

  test("it converts to TerraExtension string", () => {
    const msg = new MsgInstantiateContract({
      sender: "address1",
      admin: "address2",
      codeId: "10",
      label: "New contract",
      msg: {
        swap: {
          offer_asset: {
            info: {
              native_token: {
                denom: "uastrod",
              },
            },
            amount: "1000000",
          },
        },
      },
      funds: [{ amount: "1000000", denom: "uastrod" }],
    });

    const terraExtensionMsg: string = msg.toTerraExtensionMsg();

    expect(terraExtensionMsg).toEqual(
      JSON.stringify({
        "@type": "/cosmwasm.wasm.v1.MsgInstantiateContract",
        sender: "address1",
        admin: "address2",
        code_id: "10",
        label: "New contract",
        msg: {
          swap: {
            offer_asset: {
              info: {
                native_token: {
                  denom: "uastrod",
                },
              },
              amount: "1000000",
            },
          },
        },
        funds: [{ amount: "1000000", denom: "uastrod" }],
      }),
    );
  });

  test("it converts to AminoMsg", () => {
    const msg = new MsgInstantiateContract({
      sender: "address1",
      admin: "address2",
      codeId: "10",
      label: "New contract",
      msg: {
        swap: {
          offer_asset: {
            info: {
              native_token: {
                denom: "uastrod",
              },
            },
            amount: "1000000",
          },
        },
      },
      funds: [{ amount: "1000000", denom: "uastrod" }],
    });

    const aminoMsg: AminoMsg = msg.toAminoMsg();

    expect(aminoMsg).toEqual({
      type: "wasm/MsgInstantiateContract",
      value: {
        sender: "address1",
        admin: "address2",
        code_id: "10",
        label: "New contract",
        msg: {
          swap: {
            offer_asset: {
              info: {
                native_token: {
                  denom: "uastrod",
                },
              },
              amount: "1000000",
            },
          },
        },
        funds: [{ amount: "1000000", denom: "uastrod" }],
      },
    });
  });

  test("label is optional", () => {
    const msg = new MsgInstantiateContract({
      sender: "address1",
      admin: "address2",
      codeId: "10",
      msg: {
        swap: {
          offer_asset: {
            info: {
              token: {
                contract_addr: "address3",
              },
            },
            amount: "1000000",
          },
        },
      },
      funds: [{ amount: "1000000", denom: "uastrod" }],
    });

    const cosmosMsg: CosmosMsg = msg.toCosmosMsg();

    expect(cosmosMsg).toEqual({
      typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContract",
      value: {
        sender: "address1",
        admin: "address2",
        codeId: "10",
        msg: toUtf8(
          JSON.stringify({
            swap: {
              offer_asset: {
                info: {
                  token: {
                    contract_addr: "address3",
                  },
                },
                amount: "1000000",
              },
            },
          }),
        ),
        funds: [{ amount: "1000000", denom: "uastrod" }],
      },
    });

    const aminoMsg: AminoMsg = msg.toAminoMsg();

    expect(aminoMsg).toEqual({
      type: "wasm/MsgInstantiateContract",
      value: {
        sender: "address1",
        admin: "address2",
        code_id: "10",
        msg: {
          swap: {
            offer_asset: {
              info: {
                token: {
                  contract_addr: "address3",
                },
              },
              amount: "1000000",
            },
          },
        },
        funds: [{ amount: "1000000", denom: "uastrod" }],
      },
    });

    const terraExtensionMsg: string = msg.toTerraExtensionMsg();

    expect(terraExtensionMsg).toEqual(
      JSON.stringify({
        "@type": "/cosmwasm.wasm.v1.MsgInstantiateContract",
        sender: "address1",
        admin: "address2",
        code_id: "10",
        msg: {
          swap: {
            offer_asset: {
              info: {
                token: {
                  contract_addr: "address3",
                },
              },
              amount: "1000000",
            },
          },
        },
        funds: [{ amount: "1000000", denom: "uastrod" }],
      }),
    );
  });

  test("funds are optional", () => {
    const msg = new MsgInstantiateContract({
      sender: "address1",
      admin: "address2",
      codeId: "10",
      label: "New contract",
      msg: {
        swap: {
          offer_asset: {
            info: {
              token: {
                contract_addr: "address3",
              },
            },
            amount: "1000000",
          },
        },
      },
    });

    const cosmosMsg: CosmosMsg = msg.toCosmosMsg();

    expect(cosmosMsg).toEqual({
      typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContract",
      value: {
        sender: "address1",
        admin: "address2",
        codeId: "10",
        label: "New contract",
        msg: toUtf8(
          JSON.stringify({
            swap: {
              offer_asset: {
                info: {
                  token: {
                    contract_addr: "address3",
                  },
                },
                amount: "1000000",
              },
            },
          }),
        ),
        funds: [],
      },
    });

    const aminoMsg: AminoMsg = msg.toAminoMsg();

    expect(aminoMsg).toEqual({
      type: "wasm/MsgInstantiateContract",
      value: {
        sender: "address1",
        admin: "address2",
        code_id: "10",
        label: "New contract",
        msg: {
          swap: {
            offer_asset: {
              info: {
                token: {
                  contract_addr: "address3",
                },
              },
              amount: "1000000",
            },
          },
        },
        funds: [],
      },
    });

    const terraExtensionMsg: string = msg.toTerraExtensionMsg();

    expect(terraExtensionMsg).toEqual(
      JSON.stringify({
        "@type": "/cosmwasm.wasm.v1.MsgInstantiateContract",
        sender: "address1",
        admin: "address2",
        code_id: "10",
        label: "New contract",
        msg: {
          swap: {
            offer_asset: {
              info: {
                token: {
                  contract_addr: "address3",
                },
              },
              amount: "1000000",
            },
          },
        },
        funds: [],
      }),
    );
  });
});
