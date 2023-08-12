import {base64} from '@scure/base'
import {randomBytes} from '@noble/hashes/utils'
import {secp256k1} from '@noble/curves/secp256k1'
import {sha256} from '@noble/hashes/sha256'
import {xchacha20} from '@noble/ciphers/chacha'

import {utf8Decoder, utf8Encoder} from './utils.ts'

// @ts-ignore
if (typeof crypto !== 'undefined' && !crypto.subtle && crypto.webcrypto) {
  // @ts-ignore
  crypto.subtle = crypto.webcrypto.subtle
}

export const getSharedSecret = (privkey: string, pubkey: string): Uint8Array =>
  sha256(secp256k1.getSharedSecret(privkey, '02' + pubkey).subarray(1, 33))

export function encrypt(privkey: string, pubkey: string, text: string, v = 1) {
  if (v !== 1) {
    throw new Error('NIP44: unknown encryption version')
  }

  const key = getSharedSecret(privkey, pubkey)
  const nonce = randomBytes(24)
  const plaintext = utf8Encoder.encode(text)
  const ciphertext = xchacha20(key, nonce, plaintext)

  return JSON.stringify({
    ciphertext: base64.encode(ciphertext),
    nonce: base64.encode(nonce),
    v
  })
}

export function decrypt(privkey: string, pubkey: string, payload: string) {
  let data
  try {
    data = JSON.parse(payload) as {
      ciphertext: string
      nonce: string
      v: number
    }
  } catch (e) {
    throw new Error('NIP44: failed to parse payload')
  }

  if (data.v !== 1) {
    throw new Error('NIP44: unknown encryption version')
  }

  const key = getSharedSecret(privkey, pubkey)
  const nonce = base64.decode(data.nonce)
  const ciphertext = base64.decode(data.ciphertext)
  const plaintext = xchacha20(key, nonce, ciphertext)

  return utf8Decoder.decode(plaintext)
}
