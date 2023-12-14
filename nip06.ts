import { bytesToHex } from '@noble/hashes/utils'
import { wordlist } from '@scure/bip39/wordlists/english'
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39'
import { HDKey } from '@scure/bip32'

export function privateKeyFromSeedWords(mnemonic: string, passphrase?: string, account: number = 0, change : number = 0, index: number = 0): string {
  let root = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic, passphrase))
  let derivationPath = `m/44'/1237'/${account}'/${change}/${index}`
  let privateKey = root.derive(derivationPath).privateKey
  if (!privateKey) throw new Error('could not derive private key')
  return bytesToHex(privateKey)
}

export function generateSeedWords(): string {
  return generateMnemonic(wordlist)
}

export function validateWords(words: string): boolean {
  return validateMnemonic(words, wordlist)
}
