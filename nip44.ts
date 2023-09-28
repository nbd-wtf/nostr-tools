import { chacha20 } from '@noble/ciphers/chacha'
import { ensureBytes, equalBytes } from '@noble/ciphers/utils'
import { secp256k1 } from '@noble/curves/secp256k1'
import { hkdf } from '@noble/hashes/hkdf'
import { hmac } from '@noble/hashes/hmac'
import { sha256 } from '@noble/hashes/sha256'
import { concatBytes, randomBytes } from '@noble/hashes/utils'
import { base64 } from '@scure/base'
import { utf8Decoder, utf8Encoder } from './utils.ts'

export const utils = {
  v2: {
    maxPlaintextSize: 65536 - 128, // 64kb - 128
    minCiphertextSize: 100, // should be 128 if min padded to 32b: base64(1+32+32+32)
    maxCiphertextSize: 102400, // 100kb

    getConversationKey(privkeyA: string, pubkeyB: string): Uint8Array {
      const key = secp256k1.getSharedSecret(privkeyA, '02' + pubkeyB)
      return key.subarray(1, 33)
    },

    getMessageKeys(conversationKey: Uint8Array, salt: Uint8Array) {
      const keys = hkdf(sha256, conversationKey, salt, 'nip44-v2', 76)
      return {
        enc: keys.subarray(0, 32),
        nonce: keys.subarray(32, 44),
        auth: keys.subarray(44, 76),
      }
    },

    calcPadding(len: number): number {
      if (!Number.isSafeInteger(len) || len < 0) throw new Error('expected positive integer')
      if (len <= 32) return 32
      const nextpower = 1 << (Math.floor(Math.log2(len - 1)) + 1)
      const chunk = nextpower <= 256 ? 32 : nextpower / 8
      return chunk * (Math.floor((len - 1) / chunk) + 1)
    },

    pad(unpadded: string): Uint8Array {
      const unpaddedB = utf8Encoder.encode(unpadded)
      const len = unpaddedB.length
      if (len < 1 || len >= utils.v2.maxPlaintextSize) throw new Error('plaintext should be between 1b and 64KB')
      const paddedLen = utils.v2.calcPadding(len)
      const zeros = new Uint8Array(paddedLen - len)
      const lenBuf = new Uint8Array(2)
      new DataView(lenBuf.buffer).setUint16(0, len)
      return concatBytes(lenBuf, unpaddedB, zeros)
    },

    unpad(padded: Uint8Array): string {
      const unpaddedLen = new DataView(padded.buffer).getUint16(0)
      const plaintextB = padded.subarray(2, 2 + unpaddedLen)
      const pbLen = plaintextB.length
      const expectedTotalLen = 2 + utils.v2.calcPadding(pbLen)
      if (pbLen !== unpaddedLen || padded.length !== expectedTotalLen) throw new Error('invalid padding')
      return utf8Decoder.decode(plaintextB)
    },
  },
}

export function encrypt(
  key: Uint8Array,
  plaintext: string,
  options: { salt?: Uint8Array; version?: number } = {},
): string {
  const version = options.version ?? 2
  const salt = options.salt ?? randomBytes(32)
  if (version !== 2) throw new Error('unknown encryption version ' + version)
  ensureBytes(salt, 32)

  const keys = utils.v2.getMessageKeys(key, salt)
  const padded = utils.v2.pad(plaintext)
  const ciphertext = chacha20(keys.enc, keys.nonce, padded)
  const mac = hmac(sha256, keys.auth, ciphertext)

  const versionArray = new Uint8Array(1);
  versionArray[0] = 2

  console.log(versionArray)

  return base64.encode(concatBytes(versionArray, salt, ciphertext, mac))
}


export function decrypt(key: Uint8Array, ciphertext: string): string {
  const clen = ciphertext.length

  if (clen < utils.v2.minCiphertextSize || clen >= utils.v2.maxCiphertextSize)
    throw new Error('ciphertext length is invalid')

  const data = base64.decode(ciphertext)
  const version = data.subarray(0, 1)

  if (version[0] !== 2) throw new Error('unknown encryption version ' + version[0])

  const salt = data.subarray(1, 33)
  const ciphertext_ = data.subarray(33, -32)
  const mac = data.subarray(-32)

  const keys = utils.v2.getMessageKeys(key, salt)
  const calculatedMac = hmac(sha256, keys.auth, ciphertext_)

  if (!equalBytes(calculatedMac, mac)) throw new Error('encryption MAC does not match')

  const plaintext = chacha20(keys.enc, keys.nonce, ciphertext_)
  return utils.v2.unpad(plaintext)
}