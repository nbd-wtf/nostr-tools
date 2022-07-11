import {wordlist} from 'micro-bip39/wordlists/english.js'
import {
  generateMnemonic,
  mnemonicToSeedSync,
  validateMnemonic
} from 'micro-bip39'
import {HDKey} from 'micro-bip32'

export function privateKeyFromSeed(seed) {
  let root = HDKey.fromMasterSeed(Buffer.from(seed, 'hex'))
  return Buffer.from(root.derive(`m/44'/1237'/0'/0/0`).privateKey).toString(
    'hex'
  )
}

export function seedFromWords(mnemonic) {
  return Buffer.from(mnemonicToSeedSync(mnemonic)).toString('hex')
}

export function generateSeedWords() {
  return generateMnemonic(wordlist)
}

export function validateWords(words) {
  return validateMnemonic(words, wordlist)
}
