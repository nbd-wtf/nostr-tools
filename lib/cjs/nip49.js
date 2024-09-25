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

// nip49.ts
var nip49_exports = {};
__export(nip49_exports, {
  decrypt: () => decrypt,
  encrypt: () => encrypt
});
module.exports = __toCommonJS(nip49_exports);
var import_scrypt = require("@noble/hashes/scrypt");
var import_chacha = require("@noble/ciphers/chacha");
var import_utils2 = require("@noble/hashes/utils");

// nip19.ts
var import_utils = require("@noble/hashes/utils");
var import_base = require("@scure/base");
var Bech32MaxSize = 5e3;
function encodeBech32(prefix, data) {
  let words = import_base.bech32.toWords(data);
  return import_base.bech32.encode(prefix, words, Bech32MaxSize);
}
function encodeBytes(prefix, bytes) {
  return encodeBech32(prefix, bytes);
}

// nip49.ts
var import_base2 = require("@scure/base");
function encrypt(sec, password, logn = 16, ksb = 2) {
  let salt = (0, import_utils2.randomBytes)(16);
  let n = 2 ** logn;
  let key = (0, import_scrypt.scrypt)(password.normalize("NFKC"), salt, { N: n, r: 8, p: 1, dkLen: 32 });
  let nonce = (0, import_utils2.randomBytes)(24);
  let aad = Uint8Array.from([ksb]);
  let xc2p1 = (0, import_chacha.xchacha20poly1305)(key, nonce, aad);
  let ciphertext = xc2p1.encrypt(sec);
  let b = (0, import_utils2.concatBytes)(Uint8Array.from([2]), Uint8Array.from([logn]), salt, nonce, aad, ciphertext);
  return encodeBytes("ncryptsec", b);
}
function decrypt(ncryptsec, password) {
  let { prefix, words } = import_base2.bech32.decode(ncryptsec, Bech32MaxSize);
  if (prefix !== "ncryptsec") {
    throw new Error(`invalid prefix ${prefix}, expected 'ncryptsec'`);
  }
  let b = new Uint8Array(import_base2.bech32.fromWords(words));
  let version = b[0];
  if (version !== 2) {
    throw new Error(`invalid version ${version}, expected 0x02`);
  }
  let logn = b[1];
  let n = 2 ** logn;
  let salt = b.slice(2, 2 + 16);
  let nonce = b.slice(2 + 16, 2 + 16 + 24);
  let ksb = b[2 + 16 + 24];
  let aad = Uint8Array.from([ksb]);
  let ciphertext = b.slice(2 + 16 + 24 + 1);
  let key = (0, import_scrypt.scrypt)(password.normalize("NFKC"), salt, { N: n, r: 8, p: 1, dkLen: 32 });
  let xc2p1 = (0, import_chacha.xchacha20poly1305)(key, nonce, aad);
  let sec = xc2p1.decrypt(ciphertext);
  return sec;
}
