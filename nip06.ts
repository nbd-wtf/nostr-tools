import {wordlist} from '@scure/bip39/wordlists/english.js'
import {
  generateMnemonic,
  mnemonicToSeedSync,
  validateMnemonic
} from '@scure/bip39'
import {HDKey} from '@scure/bip32'

export function privateKeyFromSeed(seed: string): string {
  let root = HDKey.fromMasterSeed(Buffer.from(seed, 'hex'))
  let privateKey = root.derive(`m/44'/1237'/0'/0/0`).privateKey
  if (!privateKey) throw new Error('could not derive private key')
  return Buffer.from(privateKey).toString('hex')
}

export function seedFromWords(mnemonic: string): string {
  return Buffer.from(mnemonicToSeedSync(mnemonic)).toString('hex')
}

export function generateSeedWords(): string {
  return generateMnemonic(wordlist)
}

export function validateWords(words: string): boolean {
  return validateMnemonic(words, wordlist)
}
