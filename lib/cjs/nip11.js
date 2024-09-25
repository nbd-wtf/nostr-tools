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

// nip11.ts
var nip11_exports = {};
__export(nip11_exports, {
  fetchRelayInformation: () => fetchRelayInformation,
  useFetchImplementation: () => useFetchImplementation
});
module.exports = __toCommonJS(nip11_exports);
var _fetch;
try {
  _fetch = fetch;
} catch {
}
function useFetchImplementation(fetchImplementation) {
  _fetch = fetchImplementation;
}
async function fetchRelayInformation(url) {
  return await (await fetch(url.replace("ws://", "http://").replace("wss://", "https://"), {
    headers: { Accept: "application/nostr+json" }
  })).json();
}
