// nip06.ts
import { bytesToHex } from "@noble/hashes/utils";
import { wordlist } from "@scure/bip39/wordlists/english";
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { HDKey } from "@scure/bip32";
var DERIVATION_PATH = `m/44'/1237'`;
function privateKeyFromSeedWords(mnemonic, passphrase, accountIndex = 0) {
  let root = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic, passphrase));
  let privateKey = root.derive(`${DERIVATION_PATH}/${accountIndex}'/0/0`).privateKey;
  if (!privateKey)
    throw new Error("could not derive private key");
  return privateKey;
}
function accountFromSeedWords(mnemonic, passphrase, accountIndex = 0) {
  const root = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic, passphrase));
  const seed = root.derive(`${DERIVATION_PATH}/${accountIndex}'/0/0`);
  const publicKey = bytesToHex(seed.publicKey.slice(1));
  const privateKey = seed.privateKey;
  if (!privateKey || !publicKey) {
    throw new Error("could not derive key pair");
  }
  return { privateKey, publicKey };
}
function extendedKeysFromSeedWords(mnemonic, passphrase, extendedAccountIndex = 0) {
  let root = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic, passphrase));
  let seed = root.derive(`${DERIVATION_PATH}/${extendedAccountIndex}'`);
  let privateExtendedKey = seed.privateExtendedKey;
  let publicExtendedKey = seed.publicExtendedKey;
  if (!privateExtendedKey && !publicExtendedKey)
    throw new Error("could not derive extended key pair");
  return { privateExtendedKey, publicExtendedKey };
}
function accountFromExtendedKey(base58key, accountIndex = 0) {
  let extendedKey = HDKey.fromExtendedKey(base58key);
  let version = base58key.slice(0, 4);
  let child = extendedKey.deriveChild(0).deriveChild(accountIndex);
  let publicKey = bytesToHex(child.publicKey.slice(1));
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
  return generateMnemonic(wordlist);
}
function validateWords(words) {
  return validateMnemonic(words, wordlist);
}
export {
  accountFromExtendedKey,
  accountFromSeedWords,
  extendedKeysFromSeedWords,
  generateSeedWords,
  privateKeyFromSeedWords,
  validateWords
};
