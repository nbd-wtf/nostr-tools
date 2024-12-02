// nip44.ts
import { chacha20 } from "@noble/ciphers/chacha";
import { equalBytes } from "@noble/ciphers/utils";
import { secp256k1 } from "@noble/curves/secp256k1";
import { extract as hkdf_extract, expand as hkdf_expand } from "@noble/hashes/hkdf";
import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import { concatBytes, randomBytes } from "@noble/hashes/utils";
import { base64 } from "@scure/base";

// utils.ts
var utf8Decoder = new TextDecoder("utf-8");
var utf8Encoder = new TextEncoder();

// nip44.ts
var minPlaintextSize = 1;
var maxPlaintextSize = 65535;
function getConversationKey(privkeyA, pubkeyB) {
  const sharedX = secp256k1.getSharedSecret(privkeyA, "02" + pubkeyB).subarray(1, 33);
  return hkdf_extract(sha256, sharedX, "nip44-v2");
}
function getMessageKeys(conversationKey, nonce) {
  const keys = hkdf_expand(sha256, conversationKey, nonce, 76);
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
  return concatBytes(prefix, unpadded, suffix);
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
  const combined = concatBytes(aad, message);
  return hmac(sha256, key, combined);
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
    data = base64.decode(payload);
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
function encrypt(plaintext, conversationKey, nonce = randomBytes(32)) {
  const { chacha_key, chacha_nonce, hmac_key } = getMessageKeys(conversationKey, nonce);
  const padded = pad(plaintext);
  const ciphertext = chacha20(chacha_key, chacha_nonce, padded);
  const mac = hmacAad(hmac_key, ciphertext, nonce);
  return base64.encode(concatBytes(new Uint8Array([2]), nonce, ciphertext, mac));
}
function decrypt(payload, conversationKey) {
  const { nonce, ciphertext, mac } = decodePayload(payload);
  const { chacha_key, chacha_nonce, hmac_key } = getMessageKeys(conversationKey, nonce);
  const calculatedMac = hmacAad(hmac_key, ciphertext, nonce);
  if (!equalBytes(calculatedMac, mac))
    throw new Error("invalid MAC");
  const padded = chacha20(chacha_key, chacha_nonce, ciphertext);
  return unpad(padded);
}

// pure.ts
import { schnorr } from "@noble/curves/secp256k1";
import { bytesToHex } from "@noble/hashes/utils";

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
import { sha256 as sha2562 } from "@noble/hashes/sha256";
var JS = class {
  generateSecretKey() {
    return schnorr.utils.randomPrivateKey();
  }
  getPublicKey(secretKey) {
    return bytesToHex(schnorr.getPublicKey(secretKey));
  }
  finalizeEvent(t, secretKey) {
    const event = t;
    event.pubkey = bytesToHex(schnorr.getPublicKey(secretKey));
    event.id = getEventHash(event);
    event.sig = bytesToHex(schnorr.sign(getEventHash(event), secretKey));
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
      const valid = schnorr.verify(event.sig, hash, event.pubkey);
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
  let eventHash = sha2562(utf8Encoder.encode(serializeEvent(event)));
  return bytesToHex(eventHash);
}
var i = new JS();
var generateSecretKey = i.generateSecretKey;
var getPublicKey = i.getPublicKey;
var finalizeEvent = i.finalizeEvent;
var verifyEvent = i.verifyEvent;

// kinds.ts
var Seal = 13;
var GiftWrap = 1059;

// nip59.ts
var TWO_DAYS = 2 * 24 * 60 * 60;
var now = () => Math.round(Date.now() / 1e3);
var randomNow = () => Math.round(now() - Math.random() * TWO_DAYS);
var nip44ConversationKey = (privateKey, publicKey) => getConversationKey(privateKey, publicKey);
var nip44Encrypt = (data, privateKey, publicKey) => encrypt(JSON.stringify(data), nip44ConversationKey(privateKey, publicKey));
var nip44Decrypt = (data, privateKey) => JSON.parse(decrypt(data.content, nip44ConversationKey(privateKey, data.pubkey)));
function createRumor(event, privateKey) {
  const rumor = {
    created_at: now(),
    content: "",
    tags: [],
    ...event,
    pubkey: getPublicKey(privateKey)
  };
  rumor.id = getEventHash(rumor);
  return rumor;
}
function createSeal(rumor, privateKey, recipientPublicKey) {
  return finalizeEvent(
    {
      kind: Seal,
      content: nip44Encrypt(rumor, privateKey, recipientPublicKey),
      created_at: randomNow(),
      tags: []
    },
    privateKey
  );
}
function createWrap(seal, recipientPublicKey) {
  const randomKey = generateSecretKey();
  return finalizeEvent(
    {
      kind: GiftWrap,
      content: nip44Encrypt(seal, randomKey, recipientPublicKey),
      created_at: randomNow(),
      tags: [["p", recipientPublicKey]]
    },
    randomKey
  );
}
function wrapEvent(event, senderPrivateKey, recipientPublicKey) {
  const rumor = createRumor(event, senderPrivateKey);
  const seal = createSeal(rumor, senderPrivateKey, recipientPublicKey);
  return createWrap(seal, recipientPublicKey);
}
function wrapManyEvents(event, senderPrivateKey, recipientsPublicKeys) {
  if (!recipientsPublicKeys || recipientsPublicKeys.length === 0) {
    throw new Error("At least one recipient is required.");
  }
  const senderPublicKey = getPublicKey(senderPrivateKey);
  const wrappeds = [wrapEvent(event, senderPrivateKey, senderPublicKey)];
  recipientsPublicKeys.forEach((recipientPublicKey) => {
    wrappeds.push(wrapEvent(event, senderPrivateKey, recipientPublicKey));
  });
  return wrappeds;
}
function unwrapEvent(wrap, recipientPrivateKey) {
  const unwrappedSeal = nip44Decrypt(wrap, recipientPrivateKey);
  return nip44Decrypt(unwrappedSeal, recipientPrivateKey);
}
function unwrapManyEvents(wrappedEvents, recipientPrivateKey) {
  let unwrappedEvents = [];
  wrappedEvents.forEach((e) => {
    unwrappedEvents.push(unwrapEvent(e, recipientPrivateKey));
  });
  unwrappedEvents.sort((a, b) => a.created_at - b.created_at);
  return unwrappedEvents;
}
export {
  createRumor,
  createSeal,
  createWrap,
  unwrapEvent,
  unwrapManyEvents,
  wrapEvent,
  wrapManyEvents
};
