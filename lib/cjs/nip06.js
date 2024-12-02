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

// nip06.ts
var nip06_exports = {};
__export(nip06_exports, {
  accountFromExtendedKey: () => accountFromExtendedKey,
  accountFromSeedWords: () => accountFromSeedWords,
  extendedKeysFromSeedWords: () => extendedKeysFromSeedWords,
  generateSeedWords: () => generateSeedWords,
  privateKeyFromSeedWords: () => privateKeyFromSeedWords,
  validateWords: () => validateWords
});
module.exports = __toCommonJS(nip06_exports);
var import_utils = require("@noble/hashes/utils");
var import_english = require("@scure/bip39/wordlists/english");
var import_bip39 = require("@scure/bip39");
var import_bip32 = require("@scure/bip32");
var DERIVATION_PATH = `m/44'/1237'`;
function privateKeyFromSeedWords(mnemonic, passphrase, accountIndex = 0) {
  let root = import_bip32.HDKey.fromMasterSeed((0, import_bip39.mnemonicToSeedSync)(mnemonic, passphrase));
  let privateKey = root.derive(`${DERIVATION_PATH}/${accountIndex}'/0/0`).privateKey;
  if (!privateKey)
    throw new Error("could not derive private key");
  return privateKey;
}
function accountFromSeedWords(mnemonic, passphrase, accountIndex = 0) {
  const root = import_bip32.HDKey.fromMasterSeed((0, import_bip39.mnemonicToSeedSync)(mnemonic, passphrase));
  const seed = root.derive(`${DERIVATION_PATH}/${accountIndex}'/0/0`);
  const publicKey = (0, import_utils.bytesToHex)(seed.publicKey.slice(1));
  const privateKey = seed.privateKey;
  if (!privateKey || !publicKey) {
    throw new Error("could not derive key pair");
  }
  return { privateKey, publicKey };
}
function extendedKeysFromSeedWords(mnemonic, passphrase, extendedAccountIndex = 0) {
  let root = import_bip32.HDKey.fromMasterSeed((0, import_bip39.mnemonicToSeedSync)(mnemonic, passphrase));
  let seed = root.derive(`${DERIVATION_PATH}/${extendedAccountIndex}'`);
  let privateExtendedKey = seed.privateExtendedKey;
  let publicExtendedKey = seed.publicExtendedKey;
  if (!privateExtendedKey && !publicExtendedKey)
    throw new Error("could not derive extended key pair");
  return { privateExtendedKey, publicExtendedKey };
}
function accountFromExtendedKey(base58key, accountIndex = 0) {
  let extendedKey = import_bip32.HDKey.fromExtendedKey(base58key);
  let version = base58key.slice(0, 4);
  let child = extendedKey.deriveChild(0).deriveChild(accountIndex);
  let publicKey = (0, import_utils.bytesToHex)(child.publicKey.slice(1));
  if (!publicKey)
    throw new Error("could not derive public key");
  if (version === "xprv") {
    let privateKey = child.privateKey;
    if (!privateKey)
      throw new Error("could not derive private key");
    return { privateKey, publicKey };
  }
  return { publicKey };
}
function generateSeedWords() {
  return (0, import_bip39.generateMnemonic)(import_english.wordlist);
}
function validateWords(words) {
  return (0, import_bip39.validateMnemonic)(words, import_english.wordlist);
}
