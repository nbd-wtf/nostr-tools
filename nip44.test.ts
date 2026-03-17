import { test, expect } from 'bun:test'
import { v2 } from './nip44.js'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'
import { default as vec } from './nip44.vectors.json' with { type: 'json' }
import { schnorr } from '@noble/curves/secp256k1.js'

const v2vec = vec.v2

test('get_conversation_key', () => {
  for (const v of v2vec.valid.get_conversation_key) {
    const key = v2.utils.getConversationKey(hexToBytes(v.sec1), v.pub2)
    expect(bytesToHex(key)).toEqual(v.conversation_key)
  }
})

test('encrypt_decrypt', () => {
  for (const v of v2vec.valid.encrypt_decrypt) {
    const pub2 = bytesToHex(schnorr.getPublicKey(hexToBytes(v.sec2)))
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
      /(Point is not on curve|Cannot find square root|invalid field element)/,
    )
  }
})

// Extended prefix (big payload) tests
test('pad/unpad boundary: 65535 bytes uses 2-byte u16 prefix', () => {
  const plaintext = 'a'.repeat(65535)
  const padded = v2.utils.pad(plaintext)
  // First 2 bytes should be 0xff 0xff (65535 as u16 BE)
  expect(padded[0]).toEqual(0xff)
  expect(padded[1]).toEqual(0xff)
  const unpadded = v2.utils.unpad(padded)
  expect(unpadded).toEqual(plaintext)
})

test('pad/unpad boundary: 65536 bytes uses 6-byte extended prefix', () => {
  const plaintext = 'a'.repeat(65536)
  const padded = v2.utils.pad(plaintext)
  // First 2 bytes should be 0x00 0x00 (sentinel)
  expect(padded[0]).toEqual(0x00)
  expect(padded[1]).toEqual(0x00)
  // Next 4 bytes should be 0x00 0x01 0x00 0x00 (65536 as u32 BE)
  expect(padded[2]).toEqual(0x00)
  expect(padded[3]).toEqual(0x01)
  expect(padded[4]).toEqual(0x00)
  expect(padded[5]).toEqual(0x00)
  const unpadded = v2.utils.unpad(padded)
  expect(unpadded).toEqual(plaintext)
})

test('pad/unpad boundary: 65537 bytes uses 6-byte extended prefix', () => {
  const plaintext = 'a'.repeat(65537)
  const padded = v2.utils.pad(plaintext)
  // First 2 bytes should be sentinel
  expect(padded[0]).toEqual(0x00)
  expect(padded[1]).toEqual(0x00)
  // Next 4 bytes should be 0x00 0x01 0x00 0x01 (65537 as u32 BE)
  expect(padded[2]).toEqual(0x00)
  expect(padded[3]).toEqual(0x01)
  expect(padded[4]).toEqual(0x00)
  expect(padded[5]).toEqual(0x01)
  const unpadded = v2.utils.unpad(padded)
  expect(unpadded).toEqual(plaintext)
})

test('encrypt/decrypt round-trip with big payload (65536 bytes)', () => {
  const plaintext = 'x'.repeat(65536)
  const sec1 = hexToBytes('0000000000000000000000000000000000000000000000000000000000000001')
  const sec2 = hexToBytes('0000000000000000000000000000000000000000000000000000000000000002')
  const pub2 = bytesToHex(schnorr.getPublicKey(sec2))
  const conversationKey = v2.utils.getConversationKey(sec1, pub2)
  const encrypted = v2.encrypt(plaintext, conversationKey)
  const decrypted = v2.decrypt(encrypted, conversationKey)
  expect(decrypted).toEqual(plaintext)
})

test('encrypt/decrypt round-trip with 100000 byte payload', () => {
  const plaintext = 'z'.repeat(100000)
  const sec1 = hexToBytes('0000000000000000000000000000000000000000000000000000000000000001')
  const sec2 = hexToBytes('0000000000000000000000000000000000000000000000000000000000000002')
  const pub2 = bytesToHex(schnorr.getPublicKey(sec2))
  const conversationKey = v2.utils.getConversationKey(sec1, pub2)
  const encrypted = v2.encrypt(plaintext, conversationKey)
  const decrypted = v2.decrypt(encrypted, conversationKey)
  expect(decrypted).toEqual(plaintext)
})

// Canonicality: reject non-canonical extended prefix for small lengths
test('unpad rejects non-canonical extended prefix for length=1', () => {
  const unpaddedLen = 1
  const calcPaddedLen = v2.utils.calcPaddedLen(unpaddedLen) // 32
  const buf = new Uint8Array(6 + calcPaddedLen) // 6-byte prefix + 32 bytes padded
  buf[0] = 0x00
  buf[1] = 0x00 // sentinel
  buf[2] = 0x00
  buf[3] = 0x00
  buf[4] = 0x00
  buf[5] = 0x01 // u32 BE = 1
  buf[6] = 0x61 // 'a'
  expect(() => v2.utils.unpad(buf)).toThrow(/invalid padding/)
})

test('unpad rejects non-canonical extended prefix for length=1000', () => {
  const unpaddedLen = 1000
  const calcPaddedLen = v2.utils.calcPaddedLen(unpaddedLen) // 1024
  const buf = new Uint8Array(6 + calcPaddedLen)
  buf[0] = 0x00
  buf[1] = 0x00 // sentinel
  buf[2] = 0x00
  buf[3] = 0x00
  buf[4] = 0x03
  buf[5] = 0xe8 // u32 BE = 1000
  for (let i = 0; i < unpaddedLen; i++) buf[6 + i] = 0x61 // 'a'
  expect(() => v2.utils.unpad(buf)).toThrow(/invalid padding/)
})

test('unpad rejects non-canonical extended prefix for length=65535', () => {
  const unpaddedLen = 65535
  const calcPaddedLen = v2.utils.calcPaddedLen(unpaddedLen) // 65536
  const buf = new Uint8Array(6 + calcPaddedLen)
  buf[0] = 0x00
  buf[1] = 0x00 // sentinel
  buf[2] = 0x00
  buf[3] = 0x00
  buf[4] = 0xff
  buf[5] = 0xff // u32 BE = 65535
  for (let i = 0; i < unpaddedLen; i++) buf[6 + i] = 0x61
  expect(() => v2.utils.unpad(buf)).toThrow(/invalid padding/)
})

// Malformed extended prefix: buffer too short for the 6-byte header
test('unpad rejects truncated extended prefix (buffer shorter than 6 bytes)', () => {
  const buf = new Uint8Array([0x00, 0x00, 0x00, 0x01])
  expect(() => v2.utils.unpad(buf)).toThrow()
})

// calcPaddedLen must not overflow for large values (regression: 1 << 31 is negative in JS)
test('calcPaddedLen handles values above 2^30 correctly', () => {
  const len = 2 ** 30 + 1 // 1073741825
  const padded = v2.utils.calcPaddedLen(len)
  expect(padded).toBeGreaterThanOrEqual(len)
  // chunk = 2^31 / 8 = 268435456
  expect(padded % 268435456).toEqual(0)
})

test('calcPaddedLen handles 2^31 correctly', () => {
  const len = 2 ** 31 // 2147483648
  const padded = v2.utils.calcPaddedLen(len)
  expect(padded).toBeGreaterThanOrEqual(len)
  // chunk = 2^32 / 8 = 536870912
  expect(padded % 536870912).toEqual(0)
})

test('calcPaddedLen handles max plaintext size (2^32 - 1)', () => {
  const len = 0xffffffff // 4294967295
  const padded = v2.utils.calcPaddedLen(len)
  expect(padded).toBeGreaterThanOrEqual(len)
  // Must be exactly 2^32 = 4294967296
  expect(padded).toEqual(4294967296)
})

// Multi-byte UTF-8 near the 65536 boundary: byte length != char length
test('pad/unpad with multi-byte UTF-8 near 65536 byte boundary', () => {
  // U+00E9 (é) is 2 bytes in UTF-8. Use 32768 of them = 65536 bytes but 32768 chars
  const plaintext = '\u00e9'.repeat(32768)
  const encoded = new TextEncoder().encode(plaintext)
  expect(encoded.length).toEqual(65536) // byte length triggers extended prefix
  expect(plaintext.length).toEqual(32768) // char length is much smaller

  const padded = v2.utils.pad(plaintext)
  // Should use extended prefix since byte length is 65536
  expect(padded[0]).toEqual(0x00)
  expect(padded[1]).toEqual(0x00)
  const unpadded = v2.utils.unpad(padded)
  expect(unpadded).toEqual(plaintext)
})

test('encrypt/decrypt with multi-byte UTF-8 at 65536 bytes', () => {
  const plaintext = '\u00e9'.repeat(32768) // 65536 bytes
  const sec1 = hexToBytes('0000000000000000000000000000000000000000000000000000000000000001')
  const sec2 = hexToBytes('0000000000000000000000000000000000000000000000000000000000000002')
  const pub2 = bytesToHex(schnorr.getPublicKey(sec2))
  const conversationKey = v2.utils.getConversationKey(sec1, pub2)
  const encrypted = v2.encrypt(plaintext, conversationKey)
  const decrypted = v2.decrypt(encrypted, conversationKey)
  expect(decrypted).toEqual(plaintext)
})

// Spec test vectors: SHA-256 checksums for boundary payloads
test('spec test vectors: SHA-256 of payload at 65535/65536/65537', async () => {
  const convKey = hexToBytes('c41c775356fd92eadc63ff5a0dc1da211b268cbea22316767095b2871ea1412d')
  const nonce = hexToBytes('0000000000000000000000000000000000000000000000000000000000000001')

  async function sha256hex(data: Uint8Array): Promise<string> {
    const hash = await crypto.subtle.digest('SHA-256', data)
    return bytesToHex(new Uint8Array(hash))
  }

  const vectors = [
    {
      len: 65535,
      prefix: 'u16',
      padded_len: 65536,
      plaintext_sha256: '6e1bebca6a8229364a162a72ef064826c4cd7457bf54f190ef782bd9deff3e42',
      payload_sha256: '6d8c2810d1e870fbaa1f0a0937126cca837a15f9260e27060c331d70a3c0bc84',
    },
    {
      len: 65536,
      prefix: 'extended',
      padded_len: 65536,
      plaintext_sha256: 'bf718b6f653bebc184e1479f1935b8da974d701b893afcf49e701f3e2f9f9c5a',
      payload_sha256: 'b7b4edb36ba92e267d322d56d9aebc22e7fa96ff52e3c12adc07f07a43cbc616',
    },
    {
      len: 65537,
      prefix: 'extended',
      padded_len: 81920,
      plaintext_sha256: '008ffc88d3c96a9f307524eb361e47c5222a887fc45fa0c1fb8d429c5c23b430',
      payload_sha256: 'eeb7c7c5373894ea2c1547cfd3ccb15d5a0b2d619da852e5c79df792dcc9e435',
    },
  ]

  for (const vec of vectors) {
    const plaintext = 'a'.repeat(vec.len)
    const ptBytes = new TextEncoder().encode(plaintext)

    // Verify plaintext SHA-256
    expect(await sha256hex(ptBytes)).toEqual(vec.plaintext_sha256)

    // Verify padded length
    expect(v2.utils.calcPaddedLen(vec.len)).toEqual(vec.padded_len)

    // Verify prefix type
    const padded = v2.utils.pad(plaintext)
    if (vec.prefix === 'u16') {
      expect(padded[0]).not.toEqual(0)
    } else {
      expect(padded[0]).toEqual(0)
      expect(padded[1]).toEqual(0)
    }

    // Encrypt and verify payload SHA-256
    const payload = v2.encrypt(plaintext, convKey, nonce)
    const payloadBytes = new TextEncoder().encode(payload)
    expect(await sha256hex(payloadBytes)).toEqual(vec.payload_sha256)

    // Verify round-trip decrypt
    const decrypted = v2.decrypt(payload, convKey)
    expect(decrypted).toEqual(plaintext)
  }
})
