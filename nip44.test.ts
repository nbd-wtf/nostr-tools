import { expect, test } from "bun:test";
import { schnorr } from "@noble/curves/secp256k1";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { v2 } from "./nip44.js";
import vec from "./nip44.vectors.json";

const v2vec = vec.v2;

test("get_conversation_key", () => {
  for (const v of v2vec.valid.get_conversation_key) {
    const key = v2.utils.getConversationKey(v.sec1, v.pub2);
    expect(bytesToHex(key)).toEqual(v.conversation_key);
  }
});

test("encrypt_decrypt", () => {
  for (const v of v2vec.valid.encrypt_decrypt) {
    const pub2 = bytesToHex(schnorr.getPublicKey(v.sec2));
    const key = v2.utils.getConversationKey(v.sec1, pub2);
    expect(bytesToHex(key)).toEqual(v.conversation_key);
    const ciphertext = v2.encrypt(v.plaintext, key, hexToBytes(v.nonce));
    expect(ciphertext).toEqual(v.payload);
    const decrypted = v2.decrypt(ciphertext, key);
    expect(decrypted).toEqual(v.plaintext);
  }
});

test("calc_padded_len", () => {
  for (const [len, shouldBePaddedTo] of v2vec.valid.calc_padded_len) {
    const actual = v2.utils.calcPaddedLen(len);
    expect(actual).toEqual(shouldBePaddedTo);
  }
});

test("decrypt", async () => {
  for (const v of v2vec.invalid.decrypt) {
    expect(() => v2.decrypt(v.payload, hexToBytes(v.conversation_key))).toThrow(
      new RegExp(v.note),
    );
  }
});

test("get_conversation_key", async () => {
  for (const v of v2vec.invalid.get_conversation_key) {
    expect(() => v2.utils.getConversationKey(v.sec1, v.pub2)).toThrow(
      /(Point is not on curve|Cannot find square root)/,
    );
  }
});

// Extended prefix (big payload) tests
test("pad/unpad boundary: 65535 bytes uses 2-byte u16 prefix", () => {
  const plaintext = "a".repeat(65535);
  const padded = v2.utils.pad(plaintext);
  // First 2 bytes should be 0xff 0xff (65535 as u16 BE)
  expect(padded[0]).toEqual(0xff);
  expect(padded[1]).toEqual(0xff);
  const unpadded = v2.utils.unpad(padded);
  expect(unpadded).toEqual(plaintext);
});

test("pad/unpad boundary: 65536 bytes uses 6-byte extended prefix", () => {
  const plaintext = "a".repeat(65536);
  const padded = v2.utils.pad(plaintext);
  // First 2 bytes should be 0x00 0x00 (sentinel)
  expect(padded[0]).toEqual(0x00);
  expect(padded[1]).toEqual(0x00);
  // Next 4 bytes should be 0x00 0x01 0x00 0x00 (65536 as u32 BE)
  expect(padded[2]).toEqual(0x00);
  expect(padded[3]).toEqual(0x01);
  expect(padded[4]).toEqual(0x00);
  expect(padded[5]).toEqual(0x00);
  const unpadded = v2.utils.unpad(padded);
  expect(unpadded).toEqual(plaintext);
});

test("pad/unpad boundary: 65537 bytes uses 6-byte extended prefix", () => {
  const plaintext = "a".repeat(65537);
  const padded = v2.utils.pad(plaintext);
  // First 2 bytes should be sentinel
  expect(padded[0]).toEqual(0x00);
  expect(padded[1]).toEqual(0x00);
  // Next 4 bytes should be 0x00 0x01 0x00 0x01 (65537 as u32 BE)
  expect(padded[2]).toEqual(0x00);
  expect(padded[3]).toEqual(0x01);
  expect(padded[4]).toEqual(0x00);
  expect(padded[5]).toEqual(0x01);
  const unpadded = v2.utils.unpad(padded);
  expect(unpadded).toEqual(plaintext);
});

test("encrypt/decrypt round-trip with big payload (65536 bytes)", () => {
  const plaintext = "x".repeat(65536);
  const sec1 =
    "0000000000000000000000000000000000000000000000000000000000000001";
  const sec2 =
    "0000000000000000000000000000000000000000000000000000000000000002";
  const pub2 = bytesToHex(schnorr.getPublicKey(sec2));
  const conversationKey = v2.utils.getConversationKey(sec1, pub2);
  const encrypted = v2.encrypt(plaintext, conversationKey);
  const decrypted = v2.decrypt(encrypted, conversationKey);
  expect(decrypted).toEqual(plaintext);
});

test("encrypt/decrypt round-trip with 100000 byte payload", () => {
  const plaintext = "z".repeat(100000);
  const sec1 =
    "0000000000000000000000000000000000000000000000000000000000000001";
  const sec2 =
    "0000000000000000000000000000000000000000000000000000000000000002";
  const pub2 = bytesToHex(schnorr.getPublicKey(sec2));
  const conversationKey = v2.utils.getConversationKey(sec1, pub2);
  const encrypted = v2.encrypt(plaintext, conversationKey);
  const decrypted = v2.decrypt(encrypted, conversationKey);
  expect(decrypted).toEqual(plaintext);
});
