// nip98.ts
import { sha256 as sha2562 } from "@noble/hashes/sha256";
import { bytesToHex as bytesToHex2 } from "@noble/hashes/utils";
import { base64 } from "@scure/base";

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
import { sha256 } from "@noble/hashes/sha256";

// utils.ts
var utf8Decoder = new TextDecoder("utf-8");
var utf8Encoder = new TextEncoder();

// pure.ts
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
  let eventHash = sha256(utf8Encoder.encode(serializeEvent(event)));
  return bytesToHex(eventHash);
}
var i = new JS();
var generateSecretKey = i.generateSecretKey;
var getPublicKey = i.getPublicKey;
var finalizeEvent = i.finalizeEvent;
var verifyEvent = i.verifyEvent;

// kinds.ts
var HTTPAuth = 27235;

// nip98.ts
var _authorizationScheme = "Nostr ";
async function getToken(loginUrl, httpMethod, sign, includeAuthorizationScheme = false, payload) {
  const event = {
    kind: HTTPAuth,
    tags: [
      ["u", loginUrl],
      ["method", httpMethod]
    ],
    created_at: Math.round(new Date().getTime() / 1e3),
    content: ""
  };
  if (payload) {
    event.tags.push(["payload", hashPayload(payload)]);
  }
  const signedEvent = await sign(event);
  const authorizationScheme = includeAuthorizationScheme ? _authorizationScheme : "";
  return authorizationScheme + base64.encode(utf8Encoder.encode(JSON.stringify(signedEvent)));
}
async function validateToken(token, url, method) {
  const event = await unpackEventFromToken(token).catch((error) => {
    throw error;
  });
  const valid = await validateEvent2(event, url, method).catch((error) => {
    throw error;
  });
  return valid;
}
async function unpackEventFromToken(token) {
  if (!token) {
    throw new Error("Missing token");
  }
  token = token.replace(_authorizationScheme, "");
  const eventB64 = utf8Decoder.decode(base64.decode(token));
  if (!eventB64 || eventB64.length === 0 || !eventB64.startsWith("{")) {
    throw new Error("Invalid token");
  }
  const event = JSON.parse(eventB64);
  return event;
}
function validateEventTimestamp(event) {
  if (!event.created_at) {
    return false;
  }
  return Math.round(new Date().getTime() / 1e3) - event.created_at < 60;
}
function validateEventKind(event) {
  return event.kind === HTTPAuth;
}
function validateEventUrlTag(event, url) {
  const urlTag = event.tags.find((t) => t[0] === "u");
  if (!urlTag) {
    return false;
  }
  return urlTag.length > 0 && urlTag[1] === url;
}
function validateEventMethodTag(event, method) {
  const methodTag = event.tags.find((t) => t[0] === "method");
  if (!methodTag) {
    return false;
  }
  return methodTag.length > 0 && methodTag[1].toLowerCase() === method.toLowerCase();
}
function hashPayload(payload) {
  const hash = sha2562(utf8Encoder.encode(JSON.stringify(payload)));
  return bytesToHex2(hash);
}
function validateEventPayloadTag(event, payload) {
  const payloadTag = event.tags.find((t) => t[0] === "payload");
  if (!payloadTag) {
    return false;
  }
  const payloadHash = hashPayload(payload);
  return payloadTag.length > 0 && payloadTag[1] === payloadHash;
}
async function validateEvent2(event, url, method, body) {
  if (!verifyEvent(event)) {
    throw new Error("Invalid nostr event, signature invalid");
  }
  if (!validateEventKind(event)) {
    throw new Error("Invalid nostr event, kind invalid");
  }
  if (!validateEventTimestamp(event)) {
    throw new Error("Invalid nostr event, created_at timestamp invalid");
  }
  if (!validateEventUrlTag(event, url)) {
    throw new Error("Invalid nostr event, url tag invalid");
  }
  if (!validateEventMethodTag(event, method)) {
    throw new Error("Invalid nostr event, method tag invalid");
  }
  if (Boolean(body) && typeof body === "object" && Object.keys(body).length > 0) {
    if (!validateEventPayloadTag(event, body)) {
      throw new Error("Invalid nostr event, payload tag does not match request body hash");
    }
  }
  return true;
}
export {
  getToken,
  hashPayload,
  unpackEventFromToken,
  validateEvent2 as validateEvent,
  validateEventKind,
  validateEventMethodTag,
  validateEventPayloadTag,
  validateEventTimestamp,
  validateEventUrlTag,
  validateToken
};
