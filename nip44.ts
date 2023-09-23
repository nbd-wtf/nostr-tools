import {chacha20} from '@noble/ciphers/chacha'
import {ensureBytes, equalBytes} from '@noble/ciphers/utils'
import {secp256k1} from '@noble/curves/secp256k1'
import {hkdf} from '@noble/hashes/hkdf'
import {hmac} from '@noble/hashes/hmac'
import {sha256} from '@noble/hashes/sha256'
import {concatBytes, randomBytes} from '@noble/hashes/utils'
import {base64} from '@scure/base'
import {utf8Decoder, utf8Encoder} from './utils.ts'

export const utils = {
  v1: {
    maxPlaintextSize: 65536 - 128, // 64kb - 128
    minCiphertextSize: 100, // should be 128 if min padded to 32b: base64(1+32+32+32)
    maxCiphertextSize: 102400, // 100kb

    getConversationKey(privkeyA: string, pubkeyB: string): Uint8Array {
      const key = secp256k1.getSharedSecret(privkeyA, '02' + pubkeyB)
      return key.subarray(1, 33)
    },

    getMessageKeys(conversationKey: Uint8Array, salt: Uint8Array) {
      const keys = hkdf(sha256, conversationKey, salt, 'nip44-v1', 76)
      return {
        enc: keys.subarray(0, 32),
        nonce: keys.subarray(32, 44),
        auth: keys.subarray(44, 76)
      }
    },

    pad(unpadded: string): Uint8Array {
      const unpaddedB = utf8Encoder.encode(unpadded)
      const len = unpaddedB.length
      if (len < 1 || len >= utils.v1.maxPlaintextSize)
        throw new Error('plaintext should be between 1b and 64KB')
      let minpad = 0
      for (let i = 5; i < 17; i++) {
        minpad = Math.pow(2, i)
        if (len < minpad) break
      }
      const zeros = new Uint8Array(minpad - len)
      const lenBuf = new Uint8Array(2)
      new DataView(lenBuf.buffer).setUint16(0, len)
      return concatBytes(lenBuf, unpaddedB, zeros)
    },

    unpad(padded: Uint8Array): string {
      const unpaddedLength = new DataView(padded.buffer).getUint16(0)
      const plaintextBytes = padded.subarray(2, 2 + unpaddedLength)
      return utf8Decoder.decode(plaintextBytes)
    }
  }
}

export function encrypt(
  key: Uint8Array,
  plaintext: string,
  options: {salt?: Uint8Array; version?: number} = {}
): string {
  const version = options.version ?? 1
  const salt = options.salt ?? randomBytes(32)
  if (version !== 1) throw new Error('unknown encryption version')
  const vers = version.toString(16) // 1 => 01, 16 => 0f
  ensureBytes(salt, 32)

  const keys = utils.v1.getMessageKeys(key, salt)
  const padded = utils.v1.pad(plaintext)
  const ciphertext = chacha20(keys.enc, keys.nonce, padded)
  const mac = hmac(sha256, keys.auth, ciphertext)
  const compressed = base64.encode(concatBytes(salt, ciphertext, mac))
  return vers + compressed
}

export function decrypt(key: Uint8Array, ciphertext: string): string {
  const clen = ciphertext.length
  const version = Number.parseInt(ciphertext.slice(0, 1), 16)
  if (version !== 1) throw new Error('unknown encryption version')
  if (clen < utils.v1.minCiphertextSize || clen >= utils.v1.maxCiphertextSize)
    throw new Error('ciphertext length is invalid')

  const data = base64.decode(ciphertext.slice(1))
  const salt = data.subarray(0, 32)
  const ciphertext_ = data.subarray(32, -32)
  const mac = data.subarray(-32)

  const keys = utils.v1.getMessageKeys(key, salt)
  const calculatedMac = hmac(sha256, keys.auth, ciphertext_)
  if (!equalBytes(calculatedMac, mac))
    throw new Error('encryption MAC does not match')
  const plaintext = chacha20(keys.enc, keys.nonce, ciphertext_)
  const unpadded = utils.v1.unpad(plaintext)
  return unpadded
}
