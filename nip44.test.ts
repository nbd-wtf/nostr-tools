import { test, expect } from 'bun:test'
import { v2 } from './nip44.js'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'
import { default as vec } from './nip44.vectors.json' assert { type: 'json' }
import { schnorr } from '@noble/curves/secp256k1'
const v2vec = vec.v2

test('get_conversation_key', () => {
  for (const v of v2vec.valid.get_conversation_key) {
    const key = v2.utils.getConversationKey(hexToBytes(v.sec1), v.pub2)
    expect(bytesToHex(key)).toEqual(v.conversation_key)
  }
})

test('encrypt_decrypt', () => {
  for (const v of v2vec.valid.encrypt_decrypt) {
    const pub2 = bytesToHex(schnorr.getPublicKey(v.sec2))
    const key = v2.utils.getConversationKey(hexToBytes(v.sec1), pub2)
    expect(bytesToHex(key)).toEqual(v.conversation_key)
    const ciphertext = v2.encrypt(v.plaintext, key, hexToBytes(v.nonce))
    expect(ciphertext).toEqual(v.payload)
    const decrypted = v2.decrypt(ciphertext, key)
    expect(decrypted).toEqual(v.plaintext)
  }
})

test('calc_padded_len', () => {
  for (const [len, shouldBePaddedTo] of v2vec.valid.calc_padded_len) {
    const actual = v2.utils.calcPaddedLen(len)
    expect(actual).toEqual(shouldBePaddedTo)
  }
})

test('decrypt', async () => {
  for (const v of v2vec.invalid.decrypt) {
    expect(() => v2.decrypt(v.payload, hexToBytes(v.conversation_key))).toThrow(new RegExp(v.note))
  }
})

test('get_conversation_key', async () => {
  for (const v of v2vec.invalid.get_conversation_key) {
    expect(() => v2.utils.getConversationKey(hexToBytes(v.sec1), v.pub2)).toThrow(
      /(Point is not on curve|Cannot find square root)/,
    )
  }
})
