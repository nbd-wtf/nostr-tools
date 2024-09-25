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

// nip39.ts
var nip39_exports = {};
__export(nip39_exports, {
  useFetchImplementation: () => useFetchImplementation,
  validateGithub: () => validateGithub
});
module.exports = __toCommonJS(nip39_exports);
var _fetch;
try {
  _fetch = fetch;
} catch {
}
function useFetchImplementation(fetchImplementation) {
  _fetch = fetchImplementation;
}
async function validateGithub(pubkey, username, proof) {
  try {
    let res = await (await _fetch(`https://gist.github.com/${username}/${proof}/raw`)).text();
    return res === `Verifying that I control the following Nostr public key: ${pubkey}`;
  } catch (_) {
    return false;
  }
}
