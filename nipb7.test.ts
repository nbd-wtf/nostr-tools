import { test, expect } from 'bun:test'
import { BlossomClient } from './nipb7.ts'
import { sha256 } from '@noble/hashes/sha256'
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
