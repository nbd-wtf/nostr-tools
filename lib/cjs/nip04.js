"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// nip04.ts
var nip04_exports = {};
__export(nip04_exports, {
  decrypt: () => decrypt,
  encrypt: () => encrypt
});
module.exports = __toCommonJS(nip04_exports);
var import_utils = require("@noble/hashes/utils");
var import_secp256k1 = require("@noble/curves/secp256k1");
var import_aes = require("@noble/ciphers/aes");
var import_base = require("@scure/base");

// utils.ts
var utf8Decoder = new TextDecoder("utf-8");
var utf8Encoder = new TextEncoder();

// nip04.ts
async function encrypt(secretKey, pubkey, text) {
  const privkey = secretKey instanceof Uint8Array ? (0, import_utils.bytesToHex)(secretKey) : secretKey;
  const key = import_secp256k1.secp256k1.getSharedSecret(privkey, "02" + pubkey);
  const normalizedKey = getNormalizedX(key);
  let iv = Uint8Array.from((0, import_utils.randomBytes)(16));
  let plaintext = utf8Encoder.encode(text);
  let ciphertext = (0, import_aes.cbc)(normalizedKey, iv).encrypt(plaintext);
  let ctb64 = import_base.base64.encode(new Uint8Array(ciphertext));
  let ivb64 = import_base.base64.encode(new Uint8Array(iv.buffer));
  return `${ctb64}?iv=${ivb64}`;
}
async function decrypt(secretKey, pubkey, data) {
  const privkey = secretKey instanceof Uint8Array ? (0, import_utils.bytesToHex)(secretKey) : secretKey;
  let [ctb64, ivb64] = data.split("?iv=");
  let key = import_secp256k1.secp256k1.getSharedSecret(privkey, "02" + pubkey);
  let normalizedKey = getNormalizedX(key);
  let iv = import_base.base64.decode(ivb64);
  let ciphertext = import_base.base64.decode(ctb64);
  let plaintext = (0, import_aes.cbc)(normalizedKey, iv).decrypt(ciphertext);
  return utf8Decoder.decode(plaintext);
}
function getNormalizedX(key) {
  return key.slice(1, 33);
}
