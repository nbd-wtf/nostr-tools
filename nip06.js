import {wordlist} from 'micro-bip39/wordlists/english'
import {
  generateMnemonic,
  mnemonicToSeedSync,
  validateMnemonic
} from 'micro-bip39'
import BIP32Factory from 'bip32'
import * as ecc from 'tiny-secp256k1'

const bip32 = BIP32Factory(ecc)

export function privateKeyFromSeed(seed) {
  let root = bip32.fromSeed(Buffer.from(seed, 'hex'))
  return root.derivePath(`m/44'/1237'/0'/0'`).privateKey.toString('hex')
}

export function seedFromWords(mnemonic) {
  return Buffer.from(mnemonicToSeedSync(mnemonic, wordlist)).toString('hex')
}

export function generateSeedWords() {
  return generateMnemonic(wordlist)
}

export function validateWords(words) {
  return validateMnemonic(words, wordlist)
}
