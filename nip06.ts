import {bytesToHex} from '@noble/hashes/utils'
import {wordlist} from '@scure/bip39/wordlists/english.js'
import {
  generateMnemonic,
  mnemonicToSeedSync,
  validateMnemonic
} from '@scure/bip39'
import {HDKey} from '@scure/bip32'

export function privateKeyFromSeedWords(
  mnemonic: string,
  passphrase?: string,
  accountIndex = 0
): string {
  let root = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic, passphrase))
  let privateKey = root.derive(`m/44'/1237'/${accountIndex}'/0/0`).privateKey
  if (!privateKey) throw new Error('could not derive private key')
  return bytesToHex(privateKey)
}

export function generateSeedWords(): string {
  return generateMnemonic(wordlist)
}

export function validateWords(words: string): boolean {
  return validateMnemonic(words, wordlist)
}
