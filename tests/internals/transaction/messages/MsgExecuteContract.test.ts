import { toUtf8 } from "@cosmjs/encoding";
import { CosmosMsg, MsgExecuteContract } from "../../../../src";
import { AminoMsg } from "@cosmjs/amino";

describe("MsgExecuteContract", () => {
  test("it returns the correct typeUrl", () => {
    const msg = new MsgExecuteContract({
      sender: "address1",
      contract: "address2",
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

    expect(msg.typeUrl).toEqual("/cosmwasm.wasm.v1.MsgExecuteContract");
  });

  test("it returns the correct aminoTypeUrl", () => {
    const msg = new MsgExecuteContract({
      sender: "address1",
      contract: "address2",
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

    expect(msg.aminoTypeUrl).toEqual("wasm/MsgExecuteContract");
  });

  test("it converts to CosmosMsg", () => {
    const msg = new MsgExecuteContract({
      sender: "address1",
      contract: "address2",
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
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: {
        sender: "address1",
        contract: "address2",
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
    const msg = new MsgExecuteContract({
      sender: "address1",
      contract: "address2",
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
        "@type": "/cosmwasm.wasm.v1.MsgExecuteContract",
        sender: "address1",
        contract: "address2",
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
    const msg = new MsgExecuteContract({
      sender: "address1",
      contract: "address2",
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
      type: "wasm/MsgExecuteContract",
      value: {
        sender: "address1",
        contract: "address2",
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

  test("funds are optional", () => {
    const msg = new MsgExecuteContract({
      sender: "address1",
      contract: "address2",
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
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: {
        sender: "address1",
        contract: "address2",
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
      type: "wasm/MsgExecuteContract",
      value: {
        sender: "address1",
        contract: "address2",
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
        "@type": "/cosmwasm.wasm.v1.MsgExecuteContract",
        sender: "address1",
        contract: "address2",
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
