import { bytesToHex, randomBytes } from '@noble/hashes/utils'
import { secp256k1 } from '@noble/curves/secp256k1'
import { cbc } from '@noble/ciphers/aes'
import { base64 } from '@scure/base'

import { utf8Decoder, utf8Encoder } from './utils.ts'

export async function encrypt(secretKey: string | Uint8Array, pubkey: string, text: string): Promise<string> {
  const privkey: string = secretKey instanceof Uint8Array ? bytesToHex(secretKey) : secretKey
  const key = secp256k1.getSharedSecret(privkey, '02' + pubkey)
  const normalizedKey = getNormalizedX(key)

  let iv = Uint8Array.from(randomBytes(16))
  let plaintext = utf8Encoder.encode(text)

  let ciphertext = cbc(normalizedKey, iv).encrypt(plaintext)

  let ctb64 = base64.encode(new Uint8Array(ciphertext))
  let ivb64 = base64.encode(new Uint8Array(iv.buffer))

  return `${ctb64}?iv=${ivb64}`
}

export async function decrypt(secretKey: string | Uint8Array, pubkey: string, data: string): Promise<string> {
  const privkey: string = secretKey instanceof Uint8Array ? bytesToHex(secretKey) : secretKey
  let [ctb64, ivb64] = data.split('?iv=')
  let key = secp256k1.getSharedSecret(privkey, '02' + pubkey)
  let normalizedKey = getNormalizedX(key)

  let iv = base64.decode(ivb64)
  let ciphertext = base64.decode(ctb64)

  let plaintext = cbc(normalizedKey, iv).decrypt(ciphertext)

  return utf8Decoder.decode(plaintext)
}

function getNormalizedX(key: Uint8Array): Uint8Array {
  return key.slice(1, 33)
}
