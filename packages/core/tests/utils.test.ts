import { defaultBech32Config, objectToBase64, nonNullable } from "../src/utils";

describe("defaultBech32Config", () => {
  test("returns the correct config", () => {
    const config = defaultBech32Config("mars");

    expect(config).toEqual({
      bech32PrefixAccAddr: "mars",
      bech32PrefixAccPub: "marspub",
      bech32PrefixValAddr: "marsvaloper",
      bech32PrefixValPub: "marsvaloperpub",
      bech32PrefixConsAddr: "marsvalcons",
      bech32PrefixConsPub: "marsvalconspub",
    });
  });
});

describe("objectToBase64", () => {
  test("should convert an object to a Base64 string", () => {
    const obj = { name: "John", age: 30 };
    const base64String = objectToBase64(obj);
    expect(base64String).toBe(Buffer.from(JSON.stringify(obj)).toString("base64"));
  });

  test("should return an empty object as a Base64 string", () => {
    const obj = {};
    const base64String = objectToBase64(obj);
    expect(base64String).toBe(Buffer.from(JSON.stringify(obj)).toString("base64"));
  });

  test("should handle nested objects", () => {
    const obj = { user: { name: "John", age: 30 }, active: true };
    const base64String = objectToBase64(obj);
    expect(base64String).toBe(Buffer.from(JSON.stringify(obj)).toString("base64"));
  });
});

describe("nonNullable", () => {
  test("should return true for non-nullable values", () => {
    expect(nonNullable("Hello")).toBe(true);
    expect(nonNullable(42)).toBe(true);
    expect(nonNullable({})).toBe(true);
    expect(nonNullable([])).toBe(true);
  });

  test("should return false for null or undefined values", () => {
    expect(nonNullable(null)).toBe(false);
    expect(nonNullable(undefined)).toBe(false);
  });

  test("should work correctly wtesth type guards", () => {
    const value: string | null = "Hello";
    if (nonNullable(value)) {
      expect(typeof value).toBe("string");
    }
  });
});