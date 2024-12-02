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

// nip13.ts
var nip13_exports = {};
__export(nip13_exports, {
  fastEventHash: () => fastEventHash,
  getPow: () => getPow,
  minePow: () => minePow
});
module.exports = __toCommonJS(nip13_exports);
var import_utils = require("@noble/hashes/utils");
var import_sha256 = require("@noble/hashes/sha256");

// utils.ts
var utf8Decoder = new TextDecoder("utf-8");
var utf8Encoder = new TextEncoder();

// nip13.ts
function getPow(hex) {
  let count = 0;
  for (let i = 0; i < 64; i += 8) {
    const nibble = parseInt(hex.substring(i, i + 8), 16);
    if (nibble === 0) {
      count += 32;
    } else {
      count += Math.clz32(nibble);
      break;
    }
  }
  return count;
}
function minePow(unsigned, difficulty) {
  let count = 0;
  const event = unsigned;
  const tag = ["nonce", count.toString(), difficulty.toString()];
  event.tags.push(tag);
  while (true) {
    const now = Math.floor(new Date().getTime() / 1e3);
    if (now !== event.created_at) {
      count = 0;
      event.created_at = now;
    }
    tag[1] = (++count).toString();
    event.id = fastEventHash(event);
    if (getPow(event.id) >= difficulty) {
      break;
    }
  }
  return event;
}
function fastEventHash(evt) {
  return (0, import_utils.bytesToHex)(
    (0, import_sha256.sha256)(utf8Encoder.encode(JSON.stringify([0, evt.pubkey, evt.created_at, evt.kind, evt.tags, evt.content])))
  );
}
