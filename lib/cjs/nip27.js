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

// nip27.ts
var nip27_exports = {};
__export(nip27_exports, {
  matchAll: () => matchAll,
  regex: () => regex,
  replaceAll: () => replaceAll
});
module.exports = __toCommonJS(nip27_exports);

// nip19.ts
var import_utils = require("@noble/hashes/utils");
var import_base = require("@scure/base");

// utils.ts
var utf8Decoder = new TextDecoder("utf-8");
var utf8Encoder = new TextEncoder();

// nip19.ts
var Bech32MaxSize = 5e3;
var BECH32_REGEX = /[\x21-\x7E]{1,83}1[023456789acdefghjklmnpqrstuvwxyz]{6,}/;
function decode(nip19) {
  let { prefix, words } = import_base.bech32.decode(nip19, Bech32MaxSize);
  let data = new Uint8Array(import_base.bech32.fromWords(words));
  switch (prefix) {
    case "nprofile": {
      let tlv = parseTLV(data);
      if (!tlv[0]?.[0])
        throw new Error("missing TLV 0 for nprofile");
      if (tlv[0][0].length !== 32)
        throw new Error("TLV 0 should be 32 bytes");
      return {
        type: "nprofile",
        data: {
          pubkey: (0, import_utils.bytesToHex)(tlv[0][0]),
          relays: tlv[1] ? tlv[1].map((d) => utf8Decoder.decode(d)) : []
        }
      };
    }
    case "nevent": {
      let tlv = parseTLV(data);
      if (!tlv[0]?.[0])
        throw new Error("missing TLV 0 for nevent");
      if (tlv[0][0].length !== 32)
        throw new Error("TLV 0 should be 32 bytes");
      if (tlv[2] && tlv[2][0].length !== 32)
        throw new Error("TLV 2 should be 32 bytes");
      if (tlv[3] && tlv[3][0].length !== 4)
        throw new Error("TLV 3 should be 4 bytes");
      return {
        type: "nevent",
        data: {
          id: (0, import_utils.bytesToHex)(tlv[0][0]),
          relays: tlv[1] ? tlv[1].map((d) => utf8Decoder.decode(d)) : [],
          author: tlv[2]?.[0] ? (0, import_utils.bytesToHex)(tlv[2][0]) : void 0,
          kind: tlv[3]?.[0] ? parseInt((0, import_utils.bytesToHex)(tlv[3][0]), 16) : void 0
        }
      };
    }
    case "naddr": {
      let tlv = parseTLV(data);
      if (!tlv[0]?.[0])
        throw new Error("missing TLV 0 for naddr");
      if (!tlv[2]?.[0])
        throw new Error("missing TLV 2 for naddr");
      if (tlv[2][0].length !== 32)
        throw new Error("TLV 2 should be 32 bytes");
      if (!tlv[3]?.[0])
        throw new Error("missing TLV 3 for naddr");
      if (tlv[3][0].length !== 4)
        throw new Error("TLV 3 should be 4 bytes");
      return {
        type: "naddr",
        data: {
          identifier: utf8Decoder.decode(tlv[0][0]),
          pubkey: (0, import_utils.bytesToHex)(tlv[2][0]),
          kind: parseInt((0, import_utils.bytesToHex)(tlv[3][0]), 16),
          relays: tlv[1] ? tlv[1].map((d) => utf8Decoder.decode(d)) : []
        }
      };
    }
    case "nsec":
      return { type: prefix, data };
    case "npub":
    case "note":
      return { type: prefix, data: (0, import_utils.bytesToHex)(data) };
    case "noffer": {
      const tlv = parseTLV(data);
      if (!tlv[0]?.[0])
        throw new Error("missing TLV 0 for noffer");
      if (tlv[0][0].length !== 32)
        throw new Error("TLV 0 should be 32 bytes");
      if (!tlv[1]?.[0])
        throw new Error("missing TLV 1 for noffer");
      if (!tlv[2]?.[0])
        throw new Error("missing TLV 2 for noffer");
      if (!tlv[3]?.[0])
        throw new Error("missing TLV 3 for noffer");
      return {
        type: "noffer",
        data: {
          pubkey: (0, import_utils.bytesToHex)(tlv[0][0]),
          relay: utf8Decoder.decode(tlv[1][0]),
          offer: utf8Decoder.decode(tlv[2][0]),
          priceType: tlv[3][0][0],
          price: tlv[4] ? parseInt((0, import_utils.bytesToHex)(tlv[4][0]), 16) : void 0
        }
      };
    }
    case "ndebit": {
      const tlv = parseTLV(data);
      if (!tlv[0]?.[0])
        throw new Error("missing TLV 0 for ndebit");
      if (tlv[0][0].length !== 32)
        throw new Error("TLV 0 should be 32 bytes");
      if (!tlv[1]?.[0])
        throw new Error("missing TLV 1 for ndebit");
      return {
        type: "ndebit",
        data: {
          pubkey: (0, import_utils.bytesToHex)(tlv[0][0]),
          relay: utf8Decoder.decode(tlv[1][0]),
          pointer: tlv[2] ? utf8Decoder.decode(tlv[2][0]) : void 0
        }
      };
    }
    default:
      throw new Error(`unknown prefix ${prefix}`);
  }
}
function parseTLV(data) {
  let result = {};
  let rest = data;
  while (rest.length > 0) {
    let t = rest[0];
    let l = rest[1];
    let v = rest.slice(2, 2 + l);
    rest = rest.slice(2 + l);
    if (v.length < l)
      throw new Error(`not enough data to read on TLV ${t}`);
    result[t] = result[t] || [];
    result[t].push(v);
  }
  return result;
}

// nip21.ts
var NOSTR_URI_REGEX = new RegExp(`nostr:(${BECH32_REGEX.source})`);

// nip27.ts
var regex = () => new RegExp(`\\b${NOSTR_URI_REGEX.source}\\b`, "g");
function* matchAll(content) {
  const matches = content.matchAll(regex());
  for (const match of matches) {
    try {
      const [uri, value] = match;
      yield {
        uri,
        value,
        decoded: decode(value),
        start: match.index,
        end: match.index + uri.length
      };
    } catch (_e) {
    }
  }
}
function replaceAll(content, replacer) {
  return content.replaceAll(regex(), (uri, value) => {
    return replacer({
      uri,
      value,
      decoded: decode(value)
    });
  });
}
