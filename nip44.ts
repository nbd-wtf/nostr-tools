import {xchacha20} from '@noble/ciphers/chacha'
import {secp256k1} from '@noble/curves/secp256k1'
import {sha256} from '@noble/hashes/sha256'
import {concatBytes, randomBytes} from '@noble/hashes/utils'
import {base64} from '@scure/base'
import {utf8Decoder, utf8Encoder} from './utils.ts'
import {ensureBytes} from '@noble/ciphers/utils'

export function getConversationKey(
  privkeyA: string,
  pubkeyB: string
): Uint8Array {
  const key = secp256k1.getSharedSecret(privkeyA, '02' + pubkeyB)
  return sha256(key.subarray(1, 33))
}

export function encrypt(
  key: Uint8Array,
  plaintext: string,
  opts: {version?: number; nonce?: Uint8Array} = {}
): string {
  ensureBytes(key)
  if (typeof plaintext !== 'string') throw new Error('plaintext must be string')
  if (!opts) opts = Object.assign({}, opts, {version: 1})
  const v = opts.version ?? 1
  if (v !== 1) throw new Error('NIP44: unknown encryption version ' + v)
  let nonce = opts.nonce ?? randomBytes(24)
  ensureBytes(nonce)
  let plaintext_ = utf8Encoder.encode(plaintext)
  let ciphertext = xchacha20(key, nonce, plaintext_, plaintext_)
  let output = concatBytes(new Uint8Array([v]), nonce, ciphertext)
  return base64.encode(output)
}

export function decrypt(key: Uint8Array, ciphertext: string): string {
  ensureBytes(key)
  if (typeof ciphertext !== 'string')
    throw new Error('ciphertext must be string')
  let data: Uint8Array
  try {
    data = base64.decode(ciphertext)
  } catch (e) {
    throw new Error('failed to base64-decode ciphertext')
  }
  if (data.length < 26)
    throw new Error('NIP44: length must be at least 26 bytes')
  let v = data[0]
  if (v !== 1) throw new Error('NIP44: unknown encryption version ' + v)
  let nonce = data.slice(1, 25)
  let ciphertext_ = data.slice(25)
  let plaintext = xchacha20(key, nonce, ciphertext_)
  let text = utf8Decoder.decode(plaintext)
  return text
}
