import { chacha20 } from '@noble/ciphers/chacha'
import { equalBytes } from '@noble/ciphers/utils'
import { secp256k1 } from '@noble/curves/secp256k1'
import { expand as hkdf_expand, extract as hkdf_extract } from '@noble/hashes/hkdf'
import { hmac } from '@noble/hashes/hmac'
import { sha256 } from '@noble/hashes/sha256'
import { concatBytes, randomBytes, utf8ToBytes } from '@noble/hashes/utils'
import { base64 } from '@scure/base'

const decoder = new TextDecoder()

class u {
  static minPlaintextSize = 0x0001 // 1b msg => padded to 32b
  static maxPlaintextSize = 0xffffffff // 4294967295 (2^32-1)
  static extendedPrefixThreshold = 0x10000 // 65536: lengths below use 2-byte u16 prefix, at or above use 6-byte prefix

  static utf8Encode = utf8ToBytes

  static utf8Decode(bytes: Uint8Array): string {
    return decoder.decode(bytes)
  }

  static getConversationKey(privkeyA: string, pubkeyB: string): Uint8Array {
    const sharedX = secp256k1.getSharedSecret(privkeyA, '02' + pubkeyB).subarray(1, 33)
    return hkdf_extract(sha256, sharedX, 'nip44-v2')
  }

  static getMessageKeys(
    conversationKey: Uint8Array,
    nonce: Uint8Array,
  ): {
    chacha_key: Uint8Array
    chacha_nonce: Uint8Array
    hmac_key: Uint8Array
  } {
    const keys = hkdf_expand(sha256, conversationKey, nonce, 76)
    return {
      chacha_key: keys.subarray(0, 32),
      chacha_nonce: keys.subarray(32, 44),
      hmac_key: keys.subarray(44, 76),
    }
  }

  static calcPaddedLen(len: number): number {
    if (!Number.isSafeInteger(len) || len < 1) throw new Error('expected positive integer')
    if (len <= 32) return 32
    const nextPower = 2 ** (Math.floor(Math.log2(len - 1)) + 1)
    const chunk = nextPower <= 256 ? 32 : nextPower / 8
    return chunk * (Math.floor((len - 1) / chunk) + 1)
  }

  static writeU16BE(num: number): Uint8Array {
    if (!Number.isSafeInteger(num) || num < u.minPlaintextSize || num > 0xffff)
      throw new Error('invalid plaintext size: must be between 1 and 65535 bytes')
    const arr = new Uint8Array(2)
    new DataView(arr.buffer).setUint16(0, num, false)
    return arr
  }

  static writeU32BE(num: number): Uint8Array {
    if (!Number.isSafeInteger(num) || num < u.extendedPrefixThreshold || num > u.maxPlaintextSize)
      throw new Error('invalid plaintext size: must be between 65536 and 4294967295 bytes')
    const arr = new Uint8Array(4)
    new DataView(arr.buffer).setUint32(0, num, false)
    return arr
  }

  static pad(plaintext: string): Uint8Array {
    const unpadded = u.utf8Encode(plaintext)
    const unpaddedLen = unpadded.length
    if (unpaddedLen < u.minPlaintextSize || unpaddedLen > u.maxPlaintextSize)
      throw new Error('invalid plaintext size: must be between 1 and 4294967295 bytes')
    const prefix =
      unpaddedLen >= u.extendedPrefixThreshold
        ? concatBytes(new Uint8Array([0, 0]), u.writeU32BE(unpaddedLen)) // 6 bytes
        : u.writeU16BE(unpaddedLen) // 2 bytes
    const suffix = new Uint8Array(u.calcPaddedLen(unpaddedLen) - unpaddedLen)
    return concatBytes(prefix, unpadded, suffix)
  }

  static unpad(padded: Uint8Array): string {
    const dv = new DataView(padded.buffer, padded.byteOffset, padded.byteLength)
    const firstTwo = dv.getUint16(0)
    let unpaddedLen: number
    let prefixLen: number
    if (firstTwo === 0) {
      // Extended format: 2 zero bytes + 4-byte u32 length
      unpaddedLen = dv.getUint32(2)
      if (unpaddedLen < u.extendedPrefixThreshold) throw new Error('invalid padding')
      prefixLen = 6
    } else {
      unpaddedLen = firstTwo
      prefixLen = 2
    }
    const unpadded = padded.subarray(prefixLen, prefixLen + unpaddedLen)
    if (
      unpaddedLen < u.minPlaintextSize ||
      unpaddedLen > u.maxPlaintextSize ||
      unpadded.length !== unpaddedLen ||
      padded.length !== prefixLen + u.calcPaddedLen(unpaddedLen)
    )
      throw new Error('invalid padding')
    return u.utf8Decode(unpadded)
  }

  static hmacAad(key: Uint8Array, message: Uint8Array, aad: Uint8Array): Uint8Array {
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
  static decodePayload(payload: string): {
    nonce: Uint8Array
    ciphertext: Uint8Array
    mac: Uint8Array
  } {
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
}

export class v2 {
  static utils = u

  static encrypt(plaintext: string, conversationKey: Uint8Array, nonce: Uint8Array = randomBytes(32)): string {
    const { chacha_key, chacha_nonce, hmac_key } = u.getMessageKeys(conversationKey, nonce)
    const padded = u.pad(plaintext)
    const ciphertext = chacha20(chacha_key, chacha_nonce, padded)
    const mac = u.hmacAad(hmac_key, ciphertext, nonce)
    return base64.encode(concatBytes(new Uint8Array([2]), nonce, ciphertext, mac))
  }

  /** Callers should validate payload size before calling to prevent DoS from oversized inputs. */
  static decrypt(payload: string, conversationKey: Uint8Array): string {
    const { nonce, ciphertext, mac } = u.decodePayload(payload)
    const { chacha_key, chacha_nonce, hmac_key } = u.getMessageKeys(conversationKey, nonce)
    const calculatedMac = u.hmacAad(hmac_key, ciphertext, nonce)
    if (!equalBytes(calculatedMac, mac)) throw new Error('invalid MAC')
    const padded = chacha20(chacha_key, chacha_nonce, ciphertext)
    return u.unpad(padded)
  }
}

export default { v2 }
