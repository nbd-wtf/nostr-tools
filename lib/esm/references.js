// nip19.ts
import { bytesToHex, concatBytes, hexToBytes } from "@noble/hashes/utils";
import { bech32 } from "@scure/base";

// utils.ts
var utf8Decoder = new TextDecoder("utf-8");
var utf8Encoder = new TextEncoder();

// nip19.ts
var Bech32MaxSize = 5e3;
function decode(nip19) {
  let { prefix, words } = bech32.decode(nip19, Bech32MaxSize);
  let data = new Uint8Array(bech32.fromWords(words));
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
          pubkey: bytesToHex(tlv[0][0]),
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
          id: bytesToHex(tlv[0][0]),
          relays: tlv[1] ? tlv[1].map((d) => utf8Decoder.decode(d)) : [],
          author: tlv[2]?.[0] ? bytesToHex(tlv[2][0]) : void 0,
          kind: tlv[3]?.[0] ? parseInt(bytesToHex(tlv[3][0]), 16) : void 0
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
          pubkey: bytesToHex(tlv[2][0]),
          kind: parseInt(bytesToHex(tlv[3][0]), 16),
          relays: tlv[1] ? tlv[1].map((d) => utf8Decoder.decode(d)) : []
        }
      };
    }
    case "nsec":
      return { type: prefix, data };
    case "npub":
    case "note":
      return { type: prefix, data: bytesToHex(data) };
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
          pubkey: bytesToHex(tlv[0][0]),
          relay: utf8Decoder.decode(tlv[1][0]),
          offer: utf8Decoder.decode(tlv[2][0]),
          priceType: tlv[3][0][0],
          price: tlv[4] ? parseInt(bytesToHex(tlv[4][0]), 16) : void 0
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
          pubkey: bytesToHex(tlv[0][0]),
          relay: utf8Decoder.decode(tlv[1][0]),
          pointerId: tlv[2] ? utf8Decoder.decode(tlv[2][0]) : void 0
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

// references.ts
var mentionRegex = /\bnostr:((note|npub|naddr|nevent|nprofile)1\w+)\b|#\[(\d+)\]/g;
function parseReferences(evt) {
  let references = [];
  for (let ref of evt.content.matchAll(mentionRegex)) {
    if (ref[2]) {
      try {
        let { type, data } = decode(ref[1]);
        switch (type) {
          case "npub": {
            references.push({
              text: ref[0],
              profile: { pubkey: data, relays: [] }
            });
            break;
          }
          case "nprofile": {
            references.push({
              text: ref[0],
              profile: data
            });
            break;
          }
          case "note": {
            references.push({
              text: ref[0],
              event: { id: data, relays: [] }
            });
            break;
          }
          case "nevent": {
            references.push({
              text: ref[0],
              event: data
            });
            break;
          }
          case "naddr": {
            references.push({
              text: ref[0],
              address: data
            });
            break;
          }
        }
      } catch (err) {
      }
    } else if (ref[3]) {
      let idx = parseInt(ref[3], 10);
      let tag = evt.tags[idx];
      if (!tag)
        continue;
      switch (tag[0]) {
        case "p": {
          references.push({
            text: ref[0],
            profile: { pubkey: tag[1], relays: tag[2] ? [tag[2]] : [] }
          });
          break;
        }
        case "e": {
          references.push({
            text: ref[0],
            event: { id: tag[1], relays: tag[2] ? [tag[2]] : [] }
          });
          break;
        }
        case "a": {
          try {
            let [kind, pubkey, identifier] = tag[1].split(":");
            references.push({
              text: ref[0],
              address: {
                identifier,
                pubkey,
                kind: parseInt(kind, 10),
                relays: tag[2] ? [tag[2]] : []
              }
            });
          } catch (err) {
          }
          break;
        }
      }
    }
  }
  return references;
}
export {
  parseReferences
};
