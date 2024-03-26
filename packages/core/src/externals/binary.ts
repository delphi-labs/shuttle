"use strict";

export enum WireType {
  Varint = 0,

  Fixed64 = 1,

  Bytes = 2,

  Fixed32 = 5,
}

// Reader
export interface IBinaryReader {
  buf: Uint8Array;
  pos: number;
  type: number;
  len: number;
  tag(): [number, WireType, number];
  skip(length?: number): this;
  skipType(wireType: number): this;
  uint32(): number;
  int32(): number;
  sint32(): number;
  fixed32(): number;
  sfixed32(): number;
  int64(): bigint;
  uint64(): bigint;
  sint64(): bigint;
  fixed64(): bigint;
  sfixed64(): bigint;
  float(): number;
  double(): number;
  bool(): boolean;
  bytes(): Uint8Array;
  string(): string;
}

export class BinaryReader implements IBinaryReader {
  buf: Uint8Array;
  pos: number;
  type: number;
  len: number;

  assertBounds(): void {
    if (this.pos > this.len) throw new RangeError("premature EOF");
  }

  constructor(buf?: ArrayLike<number>) {
    this.buf = buf ? new Uint8Array(buf) : new Uint8Array(0);
    this.pos = 0;
    this.type = 0;
    this.len = this.buf.length;
  }

  tag(): [number, WireType, number] {
    const tag = this.uint32(),
      fieldNo = tag >>> 3,
      wireType = tag & 7;
    if (fieldNo <= 0 || wireType < 0 || wireType > 5)
      throw new Error("illegal tag: field no " + fieldNo + " wire type " + wireType);
    return [fieldNo, wireType, tag];
  }

  skip(length?: number) {
    if (typeof length === "number") {
      if (this.pos + length > this.len) throw indexOutOfRange(this, length);
      this.pos += length;
    } else {
      do {
        if (this.pos >= this.len) throw indexOutOfRange(this);
      } while (this.buf[this.pos++] & 128);
    }
    return this;
  }

  skipType(wireType: number) {
    switch (wireType) {
      case WireType.Varint:
        this.skip();
        break;
      case WireType.Fixed64:
        this.skip(8);
        break;
      case WireType.Bytes:
        this.skip(this.uint32());
        break;
      case 3:
        while ((wireType = this.uint32() & 7) !== 4) {
          this.skipType(wireType);
        }
        break;
      case WireType.Fixed32:
        this.skip(4);
        break;

      /* istanbul ignore next */
      default:
        throw Error("invalid wire type " + wireType + " at offset " + this.pos);
    }
    return this;
  }

  uint32(): number {
    return varint32read.bind(this)();
  }

  int32(): number {
    return this.uint32() | 0;
  }

  sint32(): number {
    const num = this.uint32();
    return num % 2 === 1 ? (num + 1) / -2 : num / 2; // zigzag encoding
  }

  fixed32(): number {
    const val = readUInt32(this.buf, this.pos);
    this.pos += 4;
    return val;
  }

  sfixed32(): number {
    const val = readInt32(this.buf, this.pos);
    this.pos += 4;
    return val;
  }

  int64(): bigint {
    const [lo, hi] = varint64read.bind(this)();
    return BigInt(int64ToString(lo, hi));
  }

  uint64(): bigint {
    const [lo, hi] = varint64read.bind(this)();
    return BigInt(uInt64ToString(lo, hi));
  }

  sint64(): bigint {
    let [lo, hi] = varint64read.bind(this)();
    // zig zag
    [lo, hi] = zzDecode(lo, hi);
    return BigInt(int64ToString(lo, hi));
  }

  fixed64(): bigint {
    const lo = this.sfixed32();
    const hi = this.sfixed32();
    return BigInt(uInt64ToString(lo, hi));
  }
  sfixed64(): bigint {
    const lo = this.sfixed32();
    const hi = this.sfixed32();
    return BigInt(int64ToString(lo, hi));
  }

  float(): number {
    throw new Error("float not supported");
  }

  double(): number {
    throw new Error("double not supported");
  }

  bool(): boolean {
    const [lo, hi] = varint64read.bind(this)();
    return lo !== 0 || hi !== 0;
  }

  bytes(): Uint8Array {
    const len = this.uint32(),
      start = this.pos;
    this.pos += len;
    this.assertBounds();
    return this.buf.subarray(start, start + len);
  }

  string(): string {
    const bytes = this.bytes();
    return utf8Read(bytes, 0, bytes.length);
  }
}

// Writer
export interface IBinaryWriter {
  len: number;
  head: IOp;
  tail: IOp;
  states: State | null;
  finish(): Uint8Array;
  fork(): IBinaryWriter;
  reset(): IBinaryWriter;
  ldelim(): IBinaryWriter;
  tag(fieldNo: number, type: WireType): IBinaryWriter;
  uint32(value: number): IBinaryWriter;
  int32(value: number): IBinaryWriter;
  sint32(value: number): IBinaryWriter;
  int64(value: string | number | bigint): IBinaryWriter;
  uint64: (value: string | number | bigint) => IBinaryWriter;
  sint64(value: string | number | bigint): IBinaryWriter;
  fixed64(value: string | number | bigint): IBinaryWriter;
  sfixed64: (value: string | number | bigint) => IBinaryWriter;
  bool(value: boolean): IBinaryWriter;
  fixed32(value: number): IBinaryWriter;
  sfixed32: (value: number) => IBinaryWriter;
  float(value: number): IBinaryWriter;
  double(value: number): IBinaryWriter;
  bytes(value: Uint8Array): IBinaryWriter;
  string(value: string): IBinaryWriter;
}

interface IOp {
  len: number;
  next?: IOp;
  proceed(buf: Uint8Array | number[], pos: number): void;
}

class Op<T> implements IOp {
  fn?: ((val: T, buf: Uint8Array | number[], pos: number) => void) | null;
  len: number;
  val: T;
  next?: IOp;

  constructor(
    fn: ((val: T, buf: Uint8Array | number[], pos: number) => void | undefined | null) | null,
    len: number,
    val: T,
  ) {
    this.fn = fn;
    this.len = len;
    this.val = val;
  }

  proceed(buf: Uint8Array | number[], pos: number) {
    if (this.fn) {
      this.fn(this.val, buf, pos);
    }
  }
}

class State {
  head: IOp;
  tail: IOp;
  len: number;
  next: State | null;

  constructor(writer: BinaryWriter) {
    this.head = writer.head;
    this.tail = writer.tail;
    this.len = writer.len;
    this.next = writer.states;
  }
}

export class BinaryWriter implements IBinaryWriter {
  len = 0;
  head: IOp;
  tail: IOp;
  states: State | null;

  constructor() {
    this.head = new Op(null, 0, 0);
    this.tail = this.head;
    this.states = null;
  }

  static create() {
    return new BinaryWriter();
  }

  static alloc(size: number): Uint8Array | number[] {
    if (typeof Uint8Array !== "undefined") {
      return pool((size) => new Uint8Array(size), Uint8Array.prototype.subarray)(size);
    } else {
      return new Array(size);
    }
  }

  private _push<T>(fn: (val: T, buf: Uint8Array | number[], pos: number) => void, len: number, val: T) {
    this.tail = this.tail.next = new Op(fn, len, val);
    this.len += len;
    return this;
  }

  finish(): Uint8Array {
    let head = this.head.next,
      pos = 0;
    const buf = BinaryWriter.alloc(this.len);
    while (head) {
      head.proceed(buf, pos);
      pos += head.len;
      head = head.next;
    }
    return buf as Uint8Array;
  }

  fork(): BinaryWriter {
    this.states = new State(this);
    this.head = this.tail = new Op(null, 0, 0);
    this.len = 0;
    return this;
  }

  reset(): BinaryWriter {
    if (this.states) {
      this.head = this.states.head;
      this.tail = this.states.tail;
      this.len = this.states.len;
      this.states = this.states.next;
    } else {
      this.head = this.tail = new Op(null, 0, 0);
      this.len = 0;
    }
    return this;
  }

  ldelim(): BinaryWriter {
    const head = this.head,
      tail = this.tail,
      len = this.len;
    this.reset().uint32(len);
    if (len) {
      this.tail.next = head.next; // skip noop
      this.tail = tail;
      this.len += len;
    }
    return this;
  }

  tag(fieldNo: number, type: WireType): BinaryWriter {
    return this.uint32(((fieldNo << 3) | type) >>> 0);
  }

  uint32(value: number): BinaryWriter {
    this.len += (this.tail = this.tail.next =
      new Op(
        writeVarint32,
        (value = value >>> 0) < 128 ? 1 : value < 16384 ? 2 : value < 2097152 ? 3 : value < 268435456 ? 4 : 5,
        value,
      )).len;
    return this;
  }

  int32(value: number): BinaryWriter {
    return value < 0
      ? this._push(writeVarint64, 10, int64FromString(value.toString())) // 10 bytes per spec
      : this.uint32(value);
  }

  sint32(value: number): BinaryWriter {
    return this.uint32(((value << 1) ^ (value >> 31)) >>> 0);
  }

  int64(value: string | number | bigint): BinaryWriter {
    const { lo, hi } = int64FromString(value.toString());
    return this._push(writeVarint64, int64Length(lo, hi), { lo, hi });
  }

  // uint64 is the same with int64
  uint64 = BinaryWriter.prototype.int64;

  sint64(value: string | number | bigint): BinaryWriter {
    let { lo, hi } = int64FromString(value.toString());
    // zig zag
    [lo, hi] = zzEncode(lo, hi);
    return this._push(writeVarint64, int64Length(lo, hi), { lo, hi });
  }

  fixed64(value: string | number | bigint): BinaryWriter {
    const { lo, hi } = int64FromString(value.toString());
    return this._push(writeFixed32, 4, lo)._push(writeFixed32, 4, hi);
  }

  // sfixed64 is the same with fixed64
  sfixed64 = BinaryWriter.prototype.fixed64;

  bool(value: boolean): BinaryWriter {
    return this._push(writeByte, 1, value ? 1 : 0);
  }

  fixed32(value: number): BinaryWriter {
    return this._push(writeFixed32, 4, value >>> 0);
  }

  // sfixed32 is the same with fixed32
  sfixed32 = BinaryWriter.prototype.fixed32;

  float(value: number): BinaryWriter {
    throw new Error("float not supported" + value);
  }

  double(value: number): BinaryWriter {
    throw new Error("double not supported" + value);
  }

  bytes(value: Uint8Array): BinaryWriter {
    const len = value.length >>> 0;
    if (!len) return this._push(writeByte, 1, 0);
    return this.uint32(len)._push(writeBytes, len, value);
  }

  string(value: string): BinaryWriter {
    const len = utf8Length(value);
    return len ? this.uint32(len)._push(utf8Write, len, value) : this._push(writeByte, 1, 0);
  }
}

function writeBytes(val: Uint8Array | number[], buf: Uint8Array | number[], pos: number) {
  if (typeof Uint8Array !== "undefined") {
    (buf as Uint8Array).set(val, pos);
  } else {
    for (let i = 0; i < val.length; ++i) buf[pos + i] = val[i];
  }
}

function pool(
  alloc: (size: number) => Uint8Array,
  slice: (begin?: number, end?: number) => Uint8Array,
  size?: number,
): (size: number) => Uint8Array {
  const SIZE = size || 8192;
  const MAX = SIZE >>> 1;
  let slab: Uint8Array | null = null;
  let offset = SIZE;
  return function pool_alloc(size): Uint8Array {
    if (size < 1 || size > MAX) return alloc(size);
    if (offset + size > SIZE) {
      slab = alloc(SIZE);
      offset = 0;
    }
    const buf: Uint8Array = slice.call(slab, offset, (offset += size));
    if (offset & 7)
      // align to 32 bit
      offset = (offset | 7) + 1;
    return buf;
  };
}

function indexOutOfRange(reader: BinaryReader, writeLength?: number) {
  return RangeError("index out of range: " + reader.pos + " + " + (writeLength || 1) + " > " + reader.len);
}

// Copyright 2008 Google Inc.  All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
// * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Code generated by the Protocol Buffer compiler is owned by the owner
// of the input file used when generating it.  This code is not
// standalone and requires a support library to be linked with it.  This
// support library is itself covered by the above license.

/* eslint-disable prefer-const,@typescript-eslint/restrict-plus-operands */

/**
 * Read a 64 bit varint as two JS numbers.
 *
 * Returns tuple:
 * [0]: low bits
 * [1]: high bits
 *
 * Copyright 2008 Google Inc.  All rights reserved.
 *
 * See https://github.com/protocolbuffers/protobuf/blob/8a71927d74a4ce34efe2d8769fda198f52d20d12/js/experimental/runtime/kernel/buffer_decoder.js#L175
 */
export function varint64read(this: ReaderLike): [number, number] {
  let lowBits = 0;
  let highBits = 0;

  for (let shift = 0; shift < 28; shift += 7) {
    let b = this.buf[this.pos++];
    lowBits |= (b & 0x7f) << shift;
    if ((b & 0x80) == 0) {
      this.assertBounds();
      return [lowBits, highBits];
    }
  }

  let middleByte = this.buf[this.pos++];

  // last four bits of the first 32 bit number
  lowBits |= (middleByte & 0x0f) << 28;

  // 3 upper bits are part of the next 32 bit number
  highBits = (middleByte & 0x70) >> 4;

  if ((middleByte & 0x80) == 0) {
    this.assertBounds();
    return [lowBits, highBits];
  }

  for (let shift = 3; shift <= 31; shift += 7) {
    let b = this.buf[this.pos++];
    highBits |= (b & 0x7f) << shift;
    if ((b & 0x80) == 0) {
      this.assertBounds();
      return [lowBits, highBits];
    }
  }

  throw new Error("invalid varint");
}

/**
 * Write a 64 bit varint, given as two JS numbers, to the given bytes array.
 *
 * Copyright 2008 Google Inc.  All rights reserved.
 *
 * See https://github.com/protocolbuffers/protobuf/blob/8a71927d74a4ce34efe2d8769fda198f52d20d12/js/experimental/runtime/kernel/writer.js#L344
 */
export function varint64write(lo: number, hi: number, bytes: number[]): void {
  for (let i = 0; i < 28; i = i + 7) {
    const shift = lo >>> i;
    const hasNext = !(shift >>> 7 == 0 && hi == 0);
    const byte = (hasNext ? shift | 0x80 : shift) & 0xff;
    bytes.push(byte);
    if (!hasNext) {
      return;
    }
  }

  const splitBits = ((lo >>> 28) & 0x0f) | ((hi & 0x07) << 4);
  const hasMoreBits = !(hi >> 3 == 0);
  bytes.push((hasMoreBits ? splitBits | 0x80 : splitBits) & 0xff);

  if (!hasMoreBits) {
    return;
  }

  for (let i = 3; i < 31; i = i + 7) {
    const shift = hi >>> i;
    const hasNext = !(shift >>> 7 == 0);
    const byte = (hasNext ? shift | 0x80 : shift) & 0xff;
    bytes.push(byte);
    if (!hasNext) {
      return;
    }
  }

  bytes.push((hi >>> 31) & 0x01);
}

// constants for binary math
const TWO_PWR_32_DBL = 0x100000000;

/**
 * Parse decimal string of 64 bit integer value as two JS numbers.
 *
 * Copyright 2008 Google Inc.  All rights reserved.
 *
 * See https://github.com/protocolbuffers/protobuf-javascript/blob/a428c58273abad07c66071d9753bc4d1289de426/experimental/runtime/int64.js#L10
 */
export function int64FromString(dec: string): { lo: number; hi: number } {
  // Check for minus sign.
  const minus = dec[0] === "-";
  if (minus) {
    dec = dec.slice(1);
  }

  // Work 6 decimal digits at a time, acting like we're converting base 1e6
  // digits to binary. This is safe to do with floating point math because
  // Number.isSafeInteger(ALL_32_BITS * 1e6) == true.
  const base = 1e6;
  let lowBits = 0;
  let highBits = 0;

  function add1e6digit(begin: number, end?: number) {
    // Note: Number('') is 0.
    const digit1e6 = Number(dec.slice(begin, end));
    highBits *= base;
    lowBits = lowBits * base + digit1e6;
    // Carry bits from lowBits to
    if (lowBits >= TWO_PWR_32_DBL) {
      highBits = highBits + ((lowBits / TWO_PWR_32_DBL) | 0);
      lowBits = lowBits % TWO_PWR_32_DBL;
    }
  }

  add1e6digit(-24, -18);
  add1e6digit(-18, -12);
  add1e6digit(-12, -6);
  add1e6digit(-6);
  return minus ? negate(lowBits, highBits) : newBits(lowBits, highBits);
}

/**
 * Losslessly converts a 64-bit signed integer in 32:32 split representation
 * into a decimal string.
 *
 * Copyright 2008 Google Inc.  All rights reserved.
 *
 * See https://github.com/protocolbuffers/protobuf-javascript/blob/a428c58273abad07c66071d9753bc4d1289de426/experimental/runtime/int64.js#L10
 */
export function int64ToString(lo: number, hi: number): string {
  let bits = newBits(lo, hi);
  // If we're treating the input as a signed value and the high bit is set, do
  // a manual two's complement conversion before the decimal conversion.
  const negative = bits.hi & 0x80000000;
  if (negative) {
    bits = negate(bits.lo, bits.hi);
  }
  const result = uInt64ToString(bits.lo, bits.hi);
  return negative ? "-" + result : result;
}

/**
 * Losslessly converts a 64-bit unsigned integer in 32:32 split representation
 * into a decimal string.
 *
 * Copyright 2008 Google Inc.  All rights reserved.
 *
 * See https://github.com/protocolbuffers/protobuf-javascript/blob/a428c58273abad07c66071d9753bc4d1289de426/experimental/runtime/int64.js#L10
 */
export function uInt64ToString(lo: number, hi: number): string {
  ({ lo, hi } = toUnsigned(lo, hi));
  // Skip the expensive conversion if the number is small enough to use the
  // built-in conversions.
  // Number.MAX_SAFE_INTEGER = 0x001FFFFF FFFFFFFF, thus any number with
  // highBits <= 0x1FFFFF can be safely expressed with a double and retain
  // integer precision.
  // Proven by: Number.isSafeInteger(0x1FFFFF * 2**32 + 0xFFFFFFFF) == true.
  if (hi <= 0x1fffff) {
    return String(TWO_PWR_32_DBL * hi + lo);
  }

  // What this code is doing is essentially converting the input number from
  // base-2 to base-1e7, which allows us to represent the 64-bit range with
  // only 3 (very large) digits. Those digits are then trivial to convert to
  // a base-10 string.

  // The magic numbers used here are -
  // 2^24 = 16777216 = (1,6777216) in base-1e7.
  // 2^48 = 281474976710656 = (2,8147497,6710656) in base-1e7.

  // Split 32:32 representation into 16:24:24 representation so our
  // intermediate digits don't overflow.
  const low = lo & 0xffffff;
  const mid = ((lo >>> 24) | (hi << 8)) & 0xffffff;
  const high = (hi >> 16) & 0xffff;

  // Assemble our three base-1e7 digits, ignoring carries. The maximum
  // value in a digit at this step is representable as a 48-bit integer, which
  // can be stored in a 64-bit floating point number.
  let digitA = low + mid * 6777216 + high * 6710656;
  let digitB = mid + high * 8147497;
  let digitC = high * 2;

  // Apply carries from A to B and from B to C.
  const base = 10000000;
  if (digitA >= base) {
    digitB += Math.floor(digitA / base);
    digitA %= base;
  }

  if (digitB >= base) {
    digitC += Math.floor(digitB / base);
    digitB %= base;
  }

  // If digitC is 0, then we should have returned in the trivial code path
  // at the top for non-safe integers. Given this, we can assume both digitB
  // and digitA need leading zeros.
  return digitC.toString() + decimalFrom1e7WithLeadingZeros(digitB) + decimalFrom1e7WithLeadingZeros(digitA);
}

function toUnsigned(lo: number, hi: number): { lo: number; hi: number } {
  return { lo: lo >>> 0, hi: hi >>> 0 };
}

function newBits(lo: number, hi: number): { lo: number; hi: number } {
  return { lo: lo | 0, hi: hi | 0 };
}

/**
 * Returns two's compliment negation of input.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators#Signed_32-bit_integers
 */
function negate(lowBits: number, highBits: number) {
  highBits = ~highBits;
  if (lowBits) {
    lowBits = ~lowBits + 1;
  } else {
    // If lowBits is 0, then bitwise-not is 0xFFFFFFFF,
    // adding 1 to that, results in 0x100000000, which leaves
    // the low bits 0x0 and simply adds one to the high bits.
    highBits += 1;
  }
  return newBits(lowBits, highBits);
}

/**
 * Returns decimal representation of digit1e7 with leading zeros.
 */
const decimalFrom1e7WithLeadingZeros = (digit1e7: number) => {
  const partial = String(digit1e7);
  return "0000000".slice(partial.length) + partial;
};

/**
 * Write a 32 bit varint, signed or unsigned. Same as `varint64write(0, value, bytes)`
 *
 * Copyright 2008 Google Inc.  All rights reserved.
 *
 * See https://github.com/protocolbuffers/protobuf/blob/1b18833f4f2a2f681f4e4a25cdf3b0a43115ec26/js/binary/encoder.js#L144
 */
export function varint32write(value: number, bytes: number[]): void {
  if (value >= 0) {
    // write value as varint 32
    while (value > 0x7f) {
      bytes.push((value & 0x7f) | 0x80);
      value = value >>> 7;
    }
    bytes.push(value);
  } else {
    for (let i = 0; i < 9; i++) {
      bytes.push((value & 127) | 128);
      value = value >> 7;
    }
    bytes.push(1);
  }
}

/**
 * Read an unsigned 32 bit varint.
 *
 * See https://github.com/protocolbuffers/protobuf/blob/8a71927d74a4ce34efe2d8769fda198f52d20d12/js/experimental/runtime/kernel/buffer_decoder.js#L220
 */
export function varint32read(this: ReaderLike): number {
  let b = this.buf[this.pos++];
  let result = b & 0x7f;
  if ((b & 0x80) == 0) {
    this.assertBounds();
    return result;
  }

  b = this.buf[this.pos++];
  result |= (b & 0x7f) << 7;
  if ((b & 0x80) == 0) {
    this.assertBounds();
    return result;
  }

  b = this.buf[this.pos++];
  result |= (b & 0x7f) << 14;
  if ((b & 0x80) == 0) {
    this.assertBounds();
    return result;
  }

  b = this.buf[this.pos++];
  result |= (b & 0x7f) << 21;
  if ((b & 0x80) == 0) {
    this.assertBounds();
    return result;
  }

  // Extract only last 4 bits
  b = this.buf[this.pos++];
  result |= (b & 0x0f) << 28;

  for (let readBytes = 5; (b & 0x80) !== 0 && readBytes < 10; readBytes++) b = this.buf[this.pos++];

  if ((b & 0x80) != 0) throw new Error("invalid varint");

  this.assertBounds();

  // Result can have 32 bits, convert it to unsigned
  return result >>> 0;
}

type ReaderLike = {
  buf: Uint8Array;
  pos: number;
  len: number;
  assertBounds(): void;
};

/**
 * encode zig zag
 */
export function zzEncode(lo: number, hi: number) {
  let mask = hi >> 31;
  hi = (((hi << 1) | (lo >>> 31)) ^ mask) >>> 0;
  lo = ((lo << 1) ^ mask) >>> 0;
  return [lo, hi];
}

/**
 * decode zig zag
 */
export function zzDecode(lo: number, hi: number) {
  let mask = -(lo & 1);
  lo = (((lo >>> 1) | (hi << 31)) ^ mask) >>> 0;
  hi = ((hi >>> 1) ^ mask) >>> 0;
  return [lo, hi];
}

/**
 * unsigned int32 without moving pos.
 */
export function readUInt32(buf: Uint8Array, pos: number) {
  return (buf[pos] | (buf[pos + 1] << 8) | (buf[pos + 2] << 16)) + buf[pos + 3] * 0x1000000;
}

/**
 * signed int32 without moving pos.
 */
export function readInt32(buf: Uint8Array, pos: number) {
  return (buf[pos] | (buf[pos + 1] << 8) | (buf[pos + 2] << 16)) + (buf[pos + 3] << 24);
}

/**
 * writing varint32 to pos
 */
export function writeVarint32(val: number, buf: Uint8Array | number[], pos: number) {
  while (val > 127) {
    buf[pos++] = (val & 127) | 128;
    val >>>= 7;
  }
  buf[pos] = val;
}

/**
 * writing varint64 to pos
 */
export function writeVarint64(val: { lo: number; hi: number }, buf: Uint8Array | number[], pos: number) {
  while (val.hi) {
    buf[pos++] = (val.lo & 127) | 128;
    val.lo = ((val.lo >>> 7) | (val.hi << 25)) >>> 0;
    val.hi >>>= 7;
  }
  while (val.lo > 127) {
    buf[pos++] = (val.lo & 127) | 128;
    val.lo = val.lo >>> 7;
  }
  buf[pos++] = val.lo;
}

export function int64Length(lo: number, hi: number) {
  let part0 = lo,
    part1 = ((lo >>> 28) | (hi << 4)) >>> 0,
    part2 = hi >>> 24;
  return part2 === 0
    ? part1 === 0
      ? part0 < 16384
        ? part0 < 128
          ? 1
          : 2
        : part0 < 2097152
        ? 3
        : 4
      : part1 < 16384
      ? part1 < 128
        ? 5
        : 6
      : part1 < 2097152
      ? 7
      : 8
    : part2 < 128
    ? 9
    : 10;
}

export function writeFixed32(val: number, buf: Uint8Array | number[], pos: number) {
  buf[pos] = val & 255;
  buf[pos + 1] = (val >>> 8) & 255;
  buf[pos + 2] = (val >>> 16) & 255;
  buf[pos + 3] = val >>> 24;
}

export function writeByte(val: number, buf: Uint8Array | number[], pos: number) {
  buf[pos] = val & 255;
}

// Copyright (c) 2016, Daniel Wirtz  All rights reserved.

// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:

// * Redistributions of source code must retain the above copyright
//   notice, this list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright
//   notice, this list of conditions and the following disclaimer in the
//   documentation and/or other materials provided with the distribution.
// * Neither the name of its author, nor the names of its contributors
//   may be used to endorse or promote products derived from this software
//   without specific prior written permission.

// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

/**
 * Calculates the UTF8 byte length of a string.
 * @param {string} string String
 * @returns {number} Byte length
 */
export function utf8Length(str: string) {
  let len = 0,
    c = 0;
  for (let i = 0; i < str.length; ++i) {
    c = str.charCodeAt(i);
    if (c < 128) len += 1;
    else if (c < 2048) len += 2;
    else if ((c & 0xfc00) === 0xd800 && (str.charCodeAt(i + 1) & 0xfc00) === 0xdc00) {
      ++i;
      len += 4;
    } else len += 3;
  }
  return len;
}

/**
 * Reads UTF8 bytes as a string.
 * @param {Uint8Array} buffer Source buffer
 * @param {number} start Source start
 * @param {number} end Source end
 * @returns {string} String read
 */
export function utf8Read(buffer: ArrayLike<number>, start: number, end: number) {
  const len = end - start;
  if (len < 1) return "";
  const chunk = [];
  let parts: string[] = [],
    i = 0, // char offset
    t; // temporary
  while (start < end) {
    t = buffer[start++];
    if (t < 128) chunk[i++] = t;
    else if (t > 191 && t < 224) chunk[i++] = ((t & 31) << 6) | (buffer[start++] & 63);
    else if (t > 239 && t < 365) {
      t =
        (((t & 7) << 18) | ((buffer[start++] & 63) << 12) | ((buffer[start++] & 63) << 6) | (buffer[start++] & 63)) -
        0x10000;
      chunk[i++] = 0xd800 + (t >> 10);
      chunk[i++] = 0xdc00 + (t & 1023);
    } else chunk[i++] = ((t & 15) << 12) | ((buffer[start++] & 63) << 6) | (buffer[start++] & 63);
    if (i > 8191) {
      (parts || (parts = [])).push(String.fromCharCode(...chunk));
      i = 0;
    }
  }
  if (parts) {
    if (i) parts.push(String.fromCharCode(...chunk.slice(0, i)));
    return parts.join("");
  }
  return String.fromCharCode(...chunk.slice(0, i));
}

/**
 * Writes a string as UTF8 bytes.
 * @param {string} string Source string
 * @param {Uint8Array} buffer Destination buffer
 * @param {number} offset Destination offset
 * @returns {number} Bytes written
 */
export function utf8Write(str: string, buffer: Uint8Array | Array<number>, offset: number) {
  const start = offset;
  let c1, // character 1
    c2; // character 2
  for (let i = 0; i < str.length; ++i) {
    c1 = str.charCodeAt(i);
    if (c1 < 128) {
      buffer[offset++] = c1;
    } else if (c1 < 2048) {
      buffer[offset++] = (c1 >> 6) | 192;
      buffer[offset++] = (c1 & 63) | 128;
    } else if ((c1 & 0xfc00) === 0xd800 && ((c2 = str.charCodeAt(i + 1)) & 0xfc00) === 0xdc00) {
      c1 = 0x10000 + ((c1 & 0x03ff) << 10) + (c2 & 0x03ff);
      ++i;
      buffer[offset++] = (c1 >> 18) | 240;
      buffer[offset++] = ((c1 >> 12) & 63) | 128;
      buffer[offset++] = ((c1 >> 6) & 63) | 128;
      buffer[offset++] = (c1 & 63) | 128;
    } else {
      buffer[offset++] = (c1 >> 12) | 224;
      buffer[offset++] = ((c1 >> 6) & 63) | 128;
      buffer[offset++] = (c1 & 63) | 128;
    }
  }
  return offset - start;
}
