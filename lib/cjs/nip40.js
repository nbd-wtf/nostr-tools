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

// nip40.ts
var nip40_exports = {};
__export(nip40_exports, {
  getExpiration: () => getExpiration,
  isEventExpired: () => isEventExpired,
  onExpire: () => onExpire,
  waitForExpire: () => waitForExpire
});
module.exports = __toCommonJS(nip40_exports);
function getExpiration(event) {
  const tag = event.tags.find(([name]) => name === "expiration");
  if (tag) {
    return new Date(parseInt(tag[1]) * 1e3);
  }
}
function isEventExpired(event) {
  const expiration = getExpiration(event);
  if (expiration) {
    return Date.now() > expiration.getTime();
  } else {
    return false;
  }
}
async function waitForExpire(event) {
  const expiration = getExpiration(event);
  if (expiration) {
    const diff = expiration.getTime() - Date.now();
    if (diff > 0) {
      await sleep(diff);
      return event;
    } else {
      return event;
    }
  } else {
    throw new Error("Event has no expiration");
  }
}
function onExpire(event, callback) {
  waitForExpire(event).then(callback).catch(() => {
  });
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
