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

// wasm.ts
var wasm_exports = {};
__export(wasm_exports, {
  finalizeEvent: () => finalizeEvent,
  generateSecretKey: () => generateSecretKey,
  getPublicKey: () => getPublicKey,
  setNostrWasm: () => setNostrWasm,
  sortEvents: () => sortEvents,
  validateEvent: () => validateEvent,
  verifiedSymbol: () => verifiedSymbol,
  verifyEvent: () => verifyEvent
});
module.exports = __toCommonJS(wasm_exports);
var import_utils = require("@noble/hashes/utils");

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
function sortEvents(events) {
  return events.sort((a, b) => {
    if (a.created_at !== b.created_at) {
      return b.created_at - a.created_at;
    }
    return a.id.localeCompare(b.id);
  });
}

// wasm.ts
var nw;
function setNostrWasm(x) {
  nw = x;
}
var Wasm = class {
  generateSecretKey() {
    return nw.generateSecretKey();
  }
  getPublicKey(secretKey) {
    return (0, import_utils.bytesToHex)(nw.getPublicKey(secretKey));
  }
  finalizeEvent(t, secretKey) {
    nw.finalizeEvent(t, secretKey);
    return t;
  }
  verifyEvent(event) {
    try {
      nw.verifyEvent(event);
      event[verifiedSymbol] = true;
      return true;
    } catch (err) {
      return false;
    }
  }
};
var i = new Wasm();
var generateSecretKey = i.generateSecretKey;
var getPublicKey = i.getPublicKey;
var finalizeEvent = i.finalizeEvent;
var verifyEvent = i.verifyEvent;
