import { describe, expect, it, test } from 'bun:test'
import { BlossomClient, getHashFromURL } from './nipb7.ts'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from './utils.ts'
import { PlainKeySigner } from './signer.ts'
import { generateSecretKey } from './pure.ts'

test('blossom', async () => {
  const BLOSSOM_SERVER = 'blossom.primal.net'
  const TEST_CONTENT = 'hello world'
  const TEST_BLOB = new Blob([TEST_CONTENT], { type: 'text/plain' })

  const expectedHash = bytesToHex(sha256(new TextEncoder().encode(TEST_CONTENT)))

  const signer = new PlainKeySigner(generateSecretKey())
  const client = new BlossomClient(BLOSSOM_SERVER, signer)
  expect(client).toBeDefined()

  // check for non-existent file should throw
  const invalidHash = expectedHash.slice(0, 62) + 'ba'
  let hasThrown = false
  try {
    await client.check(invalidHash)
  } catch (err) {
    hasThrown = true
  }
  expect(hasThrown).toBeTrue()

  // upload hello world blob
  const descriptor = await client.uploadBlob(TEST_BLOB, 'text/plain')
  expect(descriptor).toBeDefined()
  expect(descriptor.sha256).toBe(expectedHash)
  expect(descriptor.size).toBe(TEST_CONTENT.length)
  expect(descriptor.type).toBe('text/plain')
  expect(descriptor.url).toContain(expectedHash)
  expect(descriptor.uploaded).toBeGreaterThan(0)
  await client.check(expectedHash)

  // download and verify
  const downloadedBuffer = await client.download(expectedHash)
  const downloadedContent = new TextDecoder().decode(downloadedBuffer)
  expect(downloadedContent).toBe(TEST_CONTENT)

  // list blobs should include our uploaded file
  const blobs = await client.list()

  expect(Array.isArray(blobs)).toBe(true)
  const ourBlob = blobs.find(blob => blob.sha256 === expectedHash)
  expect(ourBlob).toBeDefined()
  expect(ourBlob?.type).toBe('text/plain')
  expect(ourBlob?.size).toBe(TEST_CONTENT.length)

  // delete
  await client.delete(expectedHash)
})

const VALID_HASH = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

describe('getHashFromURL', () => {
  it('extracts hash from plain URL string', () => {
    expect(getHashFromURL(`https://example.com/${VALID_HASH}`)).toBe(VALID_HASH)
  })

  it('extracts hash from URL with extension', () => {
    expect(getHashFromURL(`https://example.com/${VALID_HASH}.jpg`)).toBe(VALID_HASH)
  })

  it('extracts hash from URL with query string', () => {
    expect(getHashFromURL(`https://example.com/${VALID_HASH}?foo=bar`)).toBe(VALID_HASH)
  })

  it('extracts hash from URL with fragment', () => {
    expect(getHashFromURL(`https://example.com/${VALID_HASH}#section`)).toBe(VALID_HASH)
  })

  it('extracts hash from URL with query and fragment', () => {
    expect(getHashFromURL(`https://example.com/${VALID_HASH}?foo=bar#section`)).toBe(VALID_HASH)
  })

  it('extracts hash from URL object', () => {
    expect(getHashFromURL(new URL(`https://example.com/${VALID_HASH}`))).toBe(VALID_HASH)
  })

  it('extracts hash from URL object with pathname', () => {
    const url = new URL(`https://example.com/${VALID_HASH}.png`)
    expect(getHashFromURL(url)).toBe(VALID_HASH)
  })

  it('returns null when segment is too short', () => {
    expect(getHashFromURL('https://example.com/abc')).toBeNull()
  })

  it('returns null when segment has non-hex characters', () => {
    expect(getHashFromURL(`https://example.com/${VALID_HASH.slice(0, 63)}x`)).toBeNull()
  })

  it('returns null when extension is not at position 64', () => {
    expect(getHashFromURL('https://example.com/short.jpg')).toBeNull()
  })

  it('returns null when uppercase hex chars are used', () => {
    expect(getHashFromURL(`https://example.com/${VALID_HASH.toUpperCase()}`)).toBeNull()
  })

  it('returns null for URL without hash in path', () => {
    expect(getHashFromURL('https://example.com/')).toBeNull()
  })

  it('handles localhost URL with hash', () => {
    expect(getHashFromURL(`http://localhost:3000/${VALID_HASH}`)).toBe(VALID_HASH)
  })

  it('returns hash from nested path', () => {
    expect(getHashFromURL(`https://example.com/files/${VALID_HASH}.jpg`)).toBe(VALID_HASH)
  })

  it('returns null for plain string without slash', () => {
    expect(getHashFromURL('not-a-url')).toBeNull()
  })
})
