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
        encryption: keys.subarray(0, 32),
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
      const unpadded = padded.subarray(2, 2 + unpaddedLen)
      if (
        unpaddedLen === 0 ||
        unpadded.length !== unpaddedLen ||
        padded.length !== 2 + utils.v2.calcPadding(unpaddedLen)
      )
        throw new Error('invalid padding')
      return utf8Decoder.decode(unpadded)
    },
  },
}

export function encrypt(
  key: Uint8Array,
  plaintext: string,
  options: { salt?: Uint8Array; version?: number } = {},
): string {
  const version = options.version ?? 2
  if (version !== 2) throw new Error('unknown encryption version ' + version)
  const salt = options.salt ?? randomBytes(32)
  ensureBytes(salt, 32)
  const keys = utils.v2.getMessageKeys(key, salt)
  const padded = utils.v2.pad(plaintext)
  const ciphertext = chacha20(keys.encryption, keys.nonce, padded)
  const mac = hmac(sha256, keys.auth, ciphertext)
  return base64.encode(concatBytes(new Uint8Array([version]), salt, ciphertext, mac))
}

export function decrypt(key: Uint8Array, ciphertext: string): string {
  const u = utils.v2
  ensureBytes(key, 32)

  const clen = ciphertext.length
  if (clen < u.minCiphertextSize || clen >= u.maxCiphertextSize) throw new Error('invalid ciphertext length: ' + clen)

  if (ciphertext[0] === '#') throw new Error('unknown encryption version')
  let data: Uint8Array
  try {
    data = base64.decode(ciphertext)
  } catch (error) {
    throw new Error('invalid base64: ' + (error as any).message)
  }
  const vers = data.subarray(0, 1)[0]
  if (vers !== 2) throw new Error('unknown encryption version ' + vers)

  const salt = data.subarray(1, 33)
  const ciphertext_ = data.subarray(33, -32)
  const mac = data.subarray(-32)

  const keys = u.getMessageKeys(key, salt)
  const calculatedMac = hmac(sha256, keys.auth, ciphertext_)
  if (!equalBytes(calculatedMac, mac)) throw new Error('invalid MAC')

  const padded = chacha20(keys.encryption, keys.nonce, ciphertext_)
  return u.unpad(padded)
}
