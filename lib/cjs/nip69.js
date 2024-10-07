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

// nip69.ts
var nip69_exports = {};
__export(nip69_exports, {
  SendNofferRequest: () => SendNofferRequest,
  newNip69Event: () => newNip69Event,
  newNip69Filter: () => newNip69Filter
});
module.exports = __toCommonJS(nip69_exports);

// nip44.ts
var import_chacha = require("@noble/ciphers/chacha");
var import_utils = require("@noble/ciphers/utils");
var import_secp256k1 = require("@noble/curves/secp256k1");
var import_hkdf = require("@noble/hashes/hkdf");
var import_hmac = require("@noble/hashes/hmac");
var import_sha256 = require("@noble/hashes/sha256");
var import_utils2 = require("@noble/hashes/utils");
var import_base = require("@scure/base");

// utils.ts
var utf8Decoder = new TextDecoder("utf-8");
var utf8Encoder = new TextEncoder();

// nip44.ts
var minPlaintextSize = 1;
var maxPlaintextSize = 65535;
function getConversationKey(privkeyA, pubkeyB) {
  const sharedX = import_secp256k1.secp256k1.getSharedSecret(privkeyA, "02" + pubkeyB).subarray(1, 33);
  return (0, import_hkdf.extract)(import_sha256.sha256, sharedX, "nip44-v2");
}
function getMessageKeys(conversationKey, nonce) {
  const keys = (0, import_hkdf.expand)(import_sha256.sha256, conversationKey, nonce, 76);
  return {
    chacha_key: keys.subarray(0, 32),
    chacha_nonce: keys.subarray(32, 44),
    hmac_key: keys.subarray(44, 76)
  };
}
function calcPaddedLen(len) {
  if (!Number.isSafeInteger(len) || len < 1)
    throw new Error("expected positive integer");
  if (len <= 32)
    return 32;
  const nextPower = 1 << Math.floor(Math.log2(len - 1)) + 1;
  const chunk = nextPower <= 256 ? 32 : nextPower / 8;
  return chunk * (Math.floor((len - 1) / chunk) + 1);
}
function writeU16BE(num) {
  if (!Number.isSafeInteger(num) || num < minPlaintextSize || num > maxPlaintextSize)
    throw new Error("invalid plaintext size: must be between 1 and 65535 bytes");
  const arr = new Uint8Array(2);
  new DataView(arr.buffer).setUint16(0, num, false);
  return arr;
}
function pad(plaintext) {
  const unpadded = utf8Encoder.encode(plaintext);
  const unpaddedLen = unpadded.length;
  const prefix = writeU16BE(unpaddedLen);
  const suffix = new Uint8Array(calcPaddedLen(unpaddedLen) - unpaddedLen);
  return (0, import_utils2.concatBytes)(prefix, unpadded, suffix);
}
function unpad(padded) {
  const unpaddedLen = new DataView(padded.buffer).getUint16(0);
  const unpadded = padded.subarray(2, 2 + unpaddedLen);
  if (unpaddedLen < minPlaintextSize || unpaddedLen > maxPlaintextSize || unpadded.length !== unpaddedLen || padded.length !== 2 + calcPaddedLen(unpaddedLen))
    throw new Error("invalid padding");
  return utf8Decoder.decode(unpadded);
}
function hmacAad(key, message, aad) {
  if (aad.length !== 32)
    throw new Error("AAD associated data must be 32 bytes");
  const combined = (0, import_utils2.concatBytes)(aad, message);
  return (0, import_hmac.hmac)(import_sha256.sha256, key, combined);
}
function decodePayload(payload) {
  if (typeof payload !== "string")
    throw new Error("payload must be a valid string");
  const plen = payload.length;
  if (plen < 132 || plen > 87472)
    throw new Error("invalid payload length: " + plen);
  if (payload[0] === "#")
    throw new Error("unknown encryption version");
  let data;
  try {
    data = import_base.base64.decode(payload);
  } catch (error) {
    throw new Error("invalid base64: " + error.message);
  }
  const dlen = data.length;
  if (dlen < 99 || dlen > 65603)
    throw new Error("invalid data length: " + dlen);
  const vers = data[0];
  if (vers !== 2)
    throw new Error("unknown encryption version " + vers);
  return {
    nonce: data.subarray(1, 33),
    ciphertext: data.subarray(33, -32),
    mac: data.subarray(-32)
  };
}
function encrypt(plaintext, conversationKey, nonce = (0, import_utils2.randomBytes)(32)) {
  const { chacha_key, chacha_nonce, hmac_key } = getMessageKeys(conversationKey, nonce);
  const padded = pad(plaintext);
  const ciphertext = (0, import_chacha.chacha20)(chacha_key, chacha_nonce, padded);
  const mac = hmacAad(hmac_key, ciphertext, nonce);
  return import_base.base64.encode((0, import_utils2.concatBytes)(new Uint8Array([2]), nonce, ciphertext, mac));
}
function decrypt(payload, conversationKey) {
  const { nonce, ciphertext, mac } = decodePayload(payload);
  const { chacha_key, chacha_nonce, hmac_key } = getMessageKeys(conversationKey, nonce);
  const calculatedMac = hmacAad(hmac_key, ciphertext, nonce);
  if (!(0, import_utils.equalBytes)(calculatedMac, mac))
    throw new Error("invalid MAC");
  const padded = (0, import_chacha.chacha20)(chacha_key, chacha_nonce, ciphertext);
  return unpad(padded);
}

// pure.ts
var import_secp256k12 = require("@noble/curves/secp256k1");
var import_utils4 = require("@noble/hashes/utils");

// core.ts
var verifiedSymbol = Symbol("verified");
var isRecord = (obj) => obj instanceof Object;
function validateEvent(event) {
  if (!isRecord(event))
    return false;
  if (typeof event.kind !== "number")
    return false;
  if (typeof event.content !== "string")
    return false;
  if (typeof event.created_at !== "number")
    return false;
  if (typeof event.pubkey !== "string")
    return false;
  if (!event.pubkey.match(/^[a-f0-9]{64}$/))
    return false;
  if (!Array.isArray(event.tags))
    return false;
  for (let i2 = 0; i2 < event.tags.length; i2++) {
    let tag = event.tags[i2];
    if (!Array.isArray(tag))
      return false;
    for (let j = 0; j < tag.length; j++) {
      if (typeof tag[j] === "object")
        return false;
    }
  }
  return true;
}

// pure.ts
var import_sha2562 = require("@noble/hashes/sha256");
var JS = class {
  generateSecretKey() {
    return import_secp256k12.schnorr.utils.randomPrivateKey();
  }
  getPublicKey(secretKey) {
    return (0, import_utils4.bytesToHex)(import_secp256k12.schnorr.getPublicKey(secretKey));
  }
  finalizeEvent(t, secretKey) {
    const event = t;
    event.pubkey = (0, import_utils4.bytesToHex)(import_secp256k12.schnorr.getPublicKey(secretKey));
    event.id = getEventHash(event);
    event.sig = (0, import_utils4.bytesToHex)(import_secp256k12.schnorr.sign(getEventHash(event), secretKey));
    event[verifiedSymbol] = true;
    return event;
  }
  verifyEvent(event) {
    if (typeof event[verifiedSymbol] === "boolean")
      return event[verifiedSymbol];
    const hash = getEventHash(event);
    if (hash !== event.id) {
      event[verifiedSymbol] = false;
      return false;
    }
    try {
      const valid = import_secp256k12.schnorr.verify(event.sig, hash, event.pubkey);
      event[verifiedSymbol] = valid;
      return valid;
    } catch (err) {
      event[verifiedSymbol] = false;
      return false;
    }
  }
};
function serializeEvent(evt) {
  if (!validateEvent(evt))
    throw new Error("can't serialize event with wrong or missing properties");
  return JSON.stringify([0, evt.pubkey, evt.created_at, evt.kind, evt.tags, evt.content]);
}
function getEventHash(event) {
  let eventHash = (0, import_sha2562.sha256)(utf8Encoder.encode(serializeEvent(event)));
  return (0, import_utils4.bytesToHex)(eventHash);
}
var i = new JS();
var generateSecretKey = i.generateSecretKey;
var getPublicKey = i.getPublicKey;
var finalizeEvent = i.finalizeEvent;
var verifyEvent = i.verifyEvent;

// nip69.ts
var SendNofferRequest = async (pool, privateKey, relays, toPubKey, data, timeoutSeconds = 30) => {
  const publicKey = getPublicKey(privateKey);
  const content = encrypt(JSON.stringify(data), getConversationKey(privateKey, toPubKey));
  const event = newNip69Event(content, publicKey, toPubKey);
  const signed = finalizeEvent(event, privateKey);
  await Promise.all(pool.publish(relays, signed));
  return new Promise((res, rej) => {
    let closer = { close: () => {
    } };
    const timeout = setTimeout(() => {
      closer.close();
      rej("failed to get nip69 response in time");
    }, timeoutSeconds * 1e3);
    closer = pool.subscribeMany(relays, [newNip69Filter(publicKey, signed.id)], {
      onevent: async (e) => {
        clearTimeout(timeout);
        const content2 = decrypt(e.content, getConversationKey(privateKey, toPubKey));
        res(JSON.parse(content2));
      }
    });
  });
};
var newNip69Event = (content, fromPub, toPub) => ({
  content,
  created_at: Math.floor(Date.now() / 1e3),
  kind: 21001,
  pubkey: fromPub,
  tags: [["p", toPub]]
});
var newNip69Filter = (publicKey, eventId) => ({
  since: Math.floor(Date.now() / 1e3) - 1,
  kinds: [21001],
  "#p": [publicKey],
  "#e": [eventId]
});
