import { bytesToHex } from '@noble/hashes/utils'
import { wordlist } from '@scure/bip39/wordlists/english'
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39'
import { HDKey } from '@scure/bip32'

const DERIVATION_PATH = `m/44'/1237'`

export function privateKeyFromSeedWords(mnemonic: string, passphrase?: string, accountIndex = 0): string {
  let root = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic, passphrase))
  let privateKey = root.derive(`${DERIVATION_PATH}/${accountIndex}'/0/0`).privateKey
  if (!privateKey) throw new Error('could not derive private key')
  return bytesToHex(privateKey)
}

export function accountFromSeedWords(
  mnemonic: string,
  passphrase?: string,
  accountIndex = 0,
): {
  privateKey: string
  publicKey: string
} {
  const root = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic, passphrase))
  const seed = root.derive(`${DERIVATION_PATH}/${accountIndex}'/0/0`)
  const privateKey = bytesToHex(seed.privateKey!)
  const publicKey = bytesToHex(seed.publicKey!.slice(1))
  if (!privateKey && !publicKey) {
    throw new Error('could not derive key pair')
  }
  return { privateKey, publicKey }
}

export function extendedKeysFromSeedWords(
  mnemonic: string,
  passphrase?: string,
  extendedAccountIndex = 0,
): {
  privateExtendedKey: string
  publicExtendedKey: string
} {
  let root = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic, passphrase))
  let seed = root.derive(`${DERIVATION_PATH}/${extendedAccountIndex}'`)
  let privateExtendedKey = seed.privateExtendedKey
  let publicExtendedKey = seed.publicExtendedKey
  if (!privateExtendedKey && !publicExtendedKey) throw new Error('could not derive extended key pair')
  return { privateExtendedKey, publicExtendedKey }
}

export function accountFromExtendedKey(
  base58key: string,
  accountIndex = 0,
): {
  privateKey?: string
  publicKey: string
} {
  let extendedKey = HDKey.fromExtendedKey(base58key)
  let version = base58key.slice(0, 4)
  let child = extendedKey.deriveChild(0).deriveChild(accountIndex)
  let publicKey = bytesToHex(child.publicKey!.slice(1))
  if (!publicKey) throw new Error('could not derive public key')
  if (version === 'xprv') {
    let privateKey = bytesToHex(child.privateKey!)
    if (!privateKey) throw new Error('could not derive private key')
    return { privateKey, publicKey }
  }
  return { publicKey }
}

export function generateSeedWords(): string {
  return generateMnemonic(wordlist)
}

export function validateWords(words: string): boolean {
  return validateMnemonic(words, wordlist)
}
