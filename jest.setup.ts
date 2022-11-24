import { TextEncoder } from "util";

if (typeof globalThis.TextEncoder === "undefined" || typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextEncoder = TextEncoder;
}
