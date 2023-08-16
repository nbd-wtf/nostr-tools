import {base64} from '@scure/base'
import {randomBytes} from '@noble/hashes/utils'
import {secp256k1} from '@noble/curves/secp256k1'
import {sha256} from '@noble/hashes/sha256'
import {xchacha20} from '@noble/ciphers/chacha'

import {utf8Decoder, utf8Encoder} from './utils.ts'

export const getSharedSecret = (privkey: string, pubkey: string): Uint8Array =>
  sha256(secp256k1.getSharedSecret(privkey, '02' + pubkey).subarray(1, 33))

export function encrypt(key: Uint8Array, text: string, v = 1) {
  if (v !== 1) {
    throw new Error('NIP44: unknown encryption version')
  }

  const nonce = randomBytes(24)
  const plaintext = utf8Encoder.encode(text)
  const ciphertext = xchacha20(key, nonce, plaintext)

  const payload = new Uint8Array(25 + ciphertext.length)
  payload.set([v], 0)
  payload.set(nonce, 1)
  payload.set(ciphertext, 25)

  return base64.encode(payload)
}

export function decrypt(key: Uint8Array, payload: string) {
  let data
  try {
    data = base64.decode(payload)
  } catch (e) {
    throw new Error(`NIP44: failed to base64 decode payload: ${e}`)
  }

  if (data[0] !== 1) {
    throw new Error(`NIP44: unknown encryption version: ${data[0]}`)
  }

  const nonce = data.slice(1, 25)
  const ciphertext = data.slice(25)
  const plaintext = xchacha20(key, nonce, ciphertext)

  return utf8Decoder.decode(plaintext)
}
