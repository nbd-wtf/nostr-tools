import { chacha20 } from '@noble/ciphers/chacha.js'
import { equalBytes } from '@noble/ciphers/utils.js'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { extract as hkdf_extract, expand as hkdf_expand } from '@noble/hashes/hkdf.js'
import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { concatBytes, hexToBytes, randomBytes } from '@noble/hashes/utils.js'
import { base64 } from '@scure/base'

import { utf8Decoder, utf8Encoder } from './utils.ts'

const minPlaintextSize = 0x0001 // 1b msg => padded to 32b
const maxPlaintextSize = 0xffffffff // 4294967295 (2^32-1)
const extendedPrefixThreshold = 0x10000 // 65536: lengths below use 2-byte u16 prefix, at or above use 6-byte prefix

export function getConversationKey(privkeyA: Uint8Array, pubkeyB: string): Uint8Array {
  const sharedX = secp256k1.getSharedSecret(privkeyA, hexToBytes('02' + pubkeyB)).subarray(1, 33)
  return hkdf_extract(sha256, sharedX, utf8Encoder.encode('nip44-v2'))
}

function getMessageKeys(
  conversationKey: Uint8Array,
  nonce: Uint8Array,
): { chacha_key: Uint8Array; chacha_nonce: Uint8Array; hmac_key: Uint8Array } {
  const keys = hkdf_expand(sha256, conversationKey, nonce, 76)
  return {
    chacha_key: keys.subarray(0, 32),
    chacha_nonce: keys.subarray(32, 44),
    hmac_key: keys.subarray(44, 76),
  }
}

function calcPaddedLen(len: number): number {
  if (!Number.isSafeInteger(len) || len < 1) throw new Error('expected positive integer')
  if (len <= 32) return 32
  const nextPower = 2 ** (Math.floor(Math.log2(len - 1)) + 1)
  const chunk = nextPower <= 256 ? 32 : nextPower / 8
  return chunk * (Math.floor((len - 1) / chunk) + 1)
}

function writeU16BE(num: number): Uint8Array {
  if (!Number.isSafeInteger(num) || num < minPlaintextSize || num > 0xffff)
    throw new Error('invalid plaintext size: must be between 1 and 65535 bytes')
  const arr = new Uint8Array(2)
  new DataView(arr.buffer).setUint16(0, num, false)
  return arr
}

function writeU32BE(num: number): Uint8Array {
  if (!Number.isSafeInteger(num) || num < extendedPrefixThreshold || num > maxPlaintextSize)
    throw new Error('invalid plaintext size: must be between 65536 and 4294967295 bytes')
  const arr = new Uint8Array(4)
  new DataView(arr.buffer).setUint32(0, num, false)
  return arr
}

function pad(plaintext: string): Uint8Array {
  const unpadded = utf8Encoder.encode(plaintext)
  const unpaddedLen = unpadded.length
  if (unpaddedLen < minPlaintextSize || unpaddedLen > maxPlaintextSize)
    throw new Error('invalid plaintext size: must be between 1 and 4294967295 bytes')
  const prefix =
    unpaddedLen >= extendedPrefixThreshold
      ? concatBytes(new Uint8Array([0, 0]), writeU32BE(unpaddedLen)) // 6 bytes
      : writeU16BE(unpaddedLen) // 2 bytes
  const suffix = new Uint8Array(calcPaddedLen(unpaddedLen) - unpaddedLen)
  return concatBytes(prefix, unpadded, suffix)
}

function unpad(padded: Uint8Array): string {
  const dv = new DataView(padded.buffer, padded.byteOffset, padded.byteLength)
  const firstTwo = dv.getUint16(0)
  let unpaddedLen: number
  let prefixLen: number
  if (firstTwo === 0) {
    // Extended format: 2 zero bytes + 4-byte u32 length
    unpaddedLen = dv.getUint32(2)
    if (unpaddedLen < extendedPrefixThreshold) throw new Error('invalid padding')
    prefixLen = 6
  } else {
    unpaddedLen = firstTwo
    prefixLen = 2
  }
  const unpadded = padded.subarray(prefixLen, prefixLen + unpaddedLen)
  if (
    unpaddedLen < minPlaintextSize ||
    unpaddedLen > maxPlaintextSize ||
    unpadded.length !== unpaddedLen ||
    padded.length !== prefixLen + calcPaddedLen(unpaddedLen)
  )
    throw new Error('invalid padding')
  return utf8Decoder.decode(unpadded)
}

function hmacAad(key: Uint8Array, message: Uint8Array, aad: Uint8Array): Uint8Array {
  if (aad.length !== 32) throw new Error('AAD associated data must be 32 bytes')
  const combined = concatBytes(aad, message)
  return hmac(sha256, key, combined)
}

// metadata: always 65b (version: 1b, nonce: 32b, mac: 32b)
// plaintext: 1b to 0xffffffff
// padded plaintext (small, <65536): 32b to 0x10000, with 2b prefix -> 34b to 0x10000+2
// padded plaintext (large, >=65536): 0x10000 to 0x100000000, with 6b prefix -> 0x10006 to 0x100000000+6
// ciphertext: same as padded plaintext (chacha20 doesn't change length)
// raw payload (small): 99 (65+34) to 65603 (65+0x10000+2)
// raw payload (large): 65607 (65+0x10006) to 4294967367 (65+0x100000000+6)
function decodePayload(payload: string): { nonce: Uint8Array; ciphertext: Uint8Array; mac: Uint8Array } {
  if (typeof payload !== 'string') throw new Error('payload must be a valid string')
  const plen = payload.length
  if (plen < 132) throw new Error('invalid payload length: ' + plen)
  if (payload[0] === '#') throw new Error('unknown encryption version')
  let data: Uint8Array
  try {
    data = base64.decode(payload)
  } catch (error) {
    throw new Error('invalid base64: ' + (error as any).message)
  }
  const dlen = data.length
  if (dlen < 99) throw new Error('invalid data length: ' + dlen)
  const vers = data[0]
  if (vers !== 2) throw new Error('unknown encryption version ' + vers)
  return {
    nonce: data.subarray(1, 33),
    ciphertext: data.subarray(33, -32),
    mac: data.subarray(-32),
  }
}

export function encrypt(plaintext: string, conversationKey: Uint8Array, nonce: Uint8Array = randomBytes(32)): string {
  const { chacha_key, chacha_nonce, hmac_key } = getMessageKeys(conversationKey, nonce)
  const padded = pad(plaintext)
  const ciphertext = chacha20(chacha_key, chacha_nonce, padded)
  const mac = hmacAad(hmac_key, ciphertext, nonce)
  return base64.encode(concatBytes(new Uint8Array([2]), nonce, ciphertext, mac))
}

/** Callers should validate payload size before calling to prevent DoS from oversized inputs. */
export function decrypt(payload: string, conversationKey: Uint8Array): string {
  const { nonce, ciphertext, mac } = decodePayload(payload)
  const { chacha_key, chacha_nonce, hmac_key } = getMessageKeys(conversationKey, nonce)
  const calculatedMac = hmacAad(hmac_key, ciphertext, nonce)
  if (!equalBytes(calculatedMac, mac)) throw new Error('invalid MAC')
  const padded = chacha20(chacha_key, chacha_nonce, ciphertext)
  return unpad(padded)
}

export const v2 = {
  utils: {
    getConversationKey,
    calcPaddedLen,
    pad,
    unpad,
  },
  encrypt,
  decrypt,
}
