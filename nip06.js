import createHmac from 'create-hmac'
import randomBytes from 'randombytes'
import * as bip39 from 'bip39'

export function privateKeyFromSeed(seed) {
  let hmac = createHmac('sha512', Buffer.from('Nostr seed', 'utf8'))
  hmac.update(seed)
  return hmac.digest().slice(0, 32).toString('hex')
}

export function seedFromWords(mnemonic) {
  return bip39.mnemonicToSeedSync(mnemonic)
}

export function generateSeedWords() {
  return bip39.entropyToMnemonic(randomBytes(16).toString('hex'))
}
