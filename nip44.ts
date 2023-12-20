import { chacha20 } from '@noble/ciphers/chacha'
import { ensureBytes, equalBytes } from '@noble/ciphers/utils'
import { secp256k1 } from '@noble/curves/secp256k1'
import { extract as hkdf_extract, expand as hkdf_expand } from '@noble/hashes/hkdf'
import { hmac } from '@noble/hashes/hmac'
import { sha256 } from '@noble/hashes/sha256'
import { concatBytes, randomBytes, utf8ToBytes } from '@noble/hashes/utils'
import { base64 } from '@scure/base'

const decoder = new TextDecoder()
const u = {
  minPlaintextSize: 0x0001, // 1b msg => padded to 32b
  maxPlaintextSize: 0xffff, // 65535 (64kb-1) => padded to 64kb

  utf8Encode: utf8ToBytes,
  utf8Decode(bytes: Uint8Array) {
    return decoder.decode(bytes)
  },

  getConversationKey(privkeyA: string, pubkeyB: string): Uint8Array {
    const sharedX = secp256k1.getSharedSecret(privkeyA, '02' + pubkeyB).subarray(1, 33)
    return hkdf_extract(sha256, sharedX, 'nip44-v2')
  },

  getMessageKeys(conversationKey: Uint8Array, nonce: Uint8Array) {
    ensureBytes(conversationKey, 32)
    ensureBytes(nonce, 32)
    const keys = hkdf_expand(sha256, conversationKey, nonce, 76)
    return {
      chacha_key: keys.subarray(0, 32),
      chacha_nonce: keys.subarray(32, 44),
      hmac_key: keys.subarray(44, 76),
    }
  },

  calcPaddedLen(len: number): number {
    if (!Number.isSafeInteger(len) || len < 1) throw new Error('expected positive integer')
    if (len <= 32) return 32
    const nextPower = 1 << (Math.floor(Math.log2(len - 1)) + 1)
    const chunk = nextPower <= 256 ? 32 : nextPower / 8
    return chunk * (Math.floor((len - 1) / chunk) + 1)
  },

  writeU16BE(num: number) {
    if (!Number.isSafeInteger(num) || num < u.minPlaintextSize || num > u.maxPlaintextSize)
      throw new Error('invalid plaintext size: must be between 1 and 65535 bytes')
    const arr = new Uint8Array(2)
    new DataView(arr.buffer).setUint16(0, num, false)
    return arr
  },

  pad(plaintext: string): Uint8Array {
    const unpadded = u.utf8Encode(plaintext)
    const unpaddedLen = unpadded.length
    const prefix = u.writeU16BE(unpaddedLen)
    const suffix = new Uint8Array(u.calcPaddedLen(unpaddedLen) - unpaddedLen)
    return concatBytes(prefix, unpadded, suffix)
  },

  unpad(padded: Uint8Array): string {
    const unpaddedLen = new DataView(padded.buffer).getUint16(0)
    const unpadded = padded.subarray(2, 2 + unpaddedLen)
    if (
      unpaddedLen < u.minPlaintextSize ||
      unpaddedLen > u.maxPlaintextSize ||
      unpadded.length !== unpaddedLen ||
      padded.length !== 2 + u.calcPaddedLen(unpaddedLen)
    )
      throw new Error('invalid padding')
    return u.utf8Decode(unpadded)
  },

  hmacAad(key: Uint8Array, message: Uint8Array, aad: Uint8Array) {
    if (aad.length !== 32) throw new Error('AAD associated data must be 32 bytes')
    const combined = concatBytes(aad, message)
    return hmac(sha256, key, combined)
  },

  // metadata: always 65b (version: 1b, nonce: 32b, max: 32b)
  // plaintext: 1b to 0xffff
  // padded plaintext: 32b to 0xffff
  // ciphertext: 32b+2 to 0xffff+2
  // raw payload: 99 (65+32+2) to 65603 (65+0xffff+2)
  // compressed payload (base64): 132b to 87472b
  decodePayload(payload: string) {
    if (typeof payload !== 'string') throw new Error('payload must be a valid string')
    const plen = payload.length
    if (plen < 132 || plen > 87472) throw new Error('invalid payload length: ' + plen)
    if (payload[0] === '#') throw new Error('unknown encryption version')
    let data: Uint8Array
    try {
      data = base64.decode(payload)
    } catch (error) {
      throw new Error('invalid base64: ' + (error as any).message)
    }
    const dlen = data.length
    if (dlen < 99 || dlen > 65603) throw new Error('invalid data length: ' + dlen)
    const vers = data[0]
    if (vers !== 2) throw new Error('unknown encryption version ' + vers)
    return {
      nonce: data.subarray(1, 33),
      ciphertext: data.subarray(33, -32),
      mac: data.subarray(-32),
    }
  },
}

function encrypt(plaintext: string, conversationKey: Uint8Array, nonce = randomBytes(32)): string {
  const { chacha_key, chacha_nonce, hmac_key } = u.getMessageKeys(conversationKey, nonce)
  const padded = u.pad(plaintext)
  const ciphertext = chacha20(chacha_key, chacha_nonce, padded)
  const mac = u.hmacAad(hmac_key, ciphertext, nonce)
  return base64.encode(concatBytes(new Uint8Array([2]), nonce, ciphertext, mac))
}

function decrypt(payload: string, conversationKey: Uint8Array): string {
  const { nonce, ciphertext, mac } = u.decodePayload(payload)
  const { chacha_key, chacha_nonce, hmac_key } = u.getMessageKeys(conversationKey, nonce)
  const calculatedMac = u.hmacAad(hmac_key, ciphertext, nonce)
  if (!equalBytes(calculatedMac, mac)) throw new Error('invalid MAC')
  const padded = chacha20(chacha_key, chacha_nonce, ciphertext)
  return u.unpad(padded)
}

export const v2 = {
  utils: u,
  encrypt,
  decrypt,
}

export default { v2 }
