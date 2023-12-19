import { describe, test, expect } from 'bun:test'
import { getToken, unpackEventFromToken, validateEvent, validateToken } from './nip98.ts'
import { Event, finalizeEvent } from './pure.ts'
import { generateSecretKey, getPublicKey } from './pure.ts'
import { sha256 } from '@noble/hashes/sha256'
import { utf8Encoder } from './utils.ts'
import { bytesToHex } from '@noble/hashes/utils'
import { HTTPAuth } from './kinds.ts'

const sk = generateSecretKey()

describe('getToken', () => {
  test('getToken GET returns without authorization scheme', async () => {
    let result = await getToken('http://test.com', 'get', e => finalizeEvent(e, sk))

    const decodedResult: Event = await unpackEventFromToken(result)

    expect(decodedResult.created_at).toBeGreaterThan(0)
    expect(decodedResult.content).toBe('')
    expect(decodedResult.kind).toBe(HTTPAuth)
    expect(decodedResult.pubkey).toBe(getPublicKey(sk))
    expect(decodedResult.tags).toStrictEqual([
      ['u', 'http://test.com'],
      ['method', 'get'],
    ])
  })

  test('getToken POST returns token without authorization scheme', async () => {
    let result = await getToken('http://test.com', 'post', e => finalizeEvent(e, sk))

    const decodedResult: Event = await unpackEventFromToken(result)

    expect(decodedResult.created_at).toBeGreaterThan(0)
    expect(decodedResult.content).toBe('')
    expect(decodedResult.kind).toBe(HTTPAuth)
    expect(decodedResult.pubkey).toBe(getPublicKey(sk))
    expect(decodedResult.tags).toStrictEqual([
      ['u', 'http://test.com'],
      ['method', 'post'],
    ])
  })

  test('getToken GET returns token WITH authorization scheme', async () => {
    const authorizationScheme = 'Nostr '

    let result = await getToken('http://test.com', 'post', e => finalizeEvent(e, sk), true)

    expect(result.startsWith(authorizationScheme)).toBe(true)

    const decodedResult: Event = await unpackEventFromToken(result)

    expect(decodedResult.created_at).toBeGreaterThan(0)
    expect(decodedResult.content).toBe('')
    expect(decodedResult.kind).toBe(HTTPAuth)
    expect(decodedResult.pubkey).toBe(getPublicKey(sk))
    expect(decodedResult.tags).toStrictEqual([
      ['u', 'http://test.com'],
      ['method', 'post'],
    ])
  })

  test('getToken returns token with a valid payload tag when payload is present', async () => {
    const payload = { test: 'payload' }
    const payloadHash = bytesToHex(sha256(utf8Encoder.encode(JSON.stringify(payload))))
    let result = await getToken('http://test.com', 'post', e => finalizeEvent(e, sk), true, payload)

    const decodedResult: Event = await unpackEventFromToken(result)

    expect(decodedResult.created_at).toBeGreaterThan(0)
    expect(decodedResult.content).toBe('')
    expect(decodedResult.kind).toBe(HTTPAuth)
    expect(decodedResult.pubkey).toBe(getPublicKey(sk))
    expect(decodedResult.tags).toStrictEqual([
      ['u', 'http://test.com'],
      ['method', 'post'],
      ['payload', payloadHash],
    ])
  })
})

describe('validateToken', () => {
  test('validateToken returns true for valid token without authorization scheme', async () => {
    const validToken = await getToken('http://test.com', 'get', e => finalizeEvent(e, sk))

    const result = await validateToken(validToken, 'http://test.com', 'get')
    expect(result).toBe(true)
  })

  test('validateToken returns true for valid token with authorization scheme', async () => {
    const validToken = await getToken('http://test.com', 'get', e => finalizeEvent(e, sk), true)

    const result = await validateToken(validToken, 'http://test.com', 'get')
    expect(result).toBe(true)
  })

  test('validateToken throws an error for invalid token', async () => {
    const result = validateToken('fake', 'http://test.com', 'get')
    expect(result).rejects.toThrow(Error)
  })

  test('validateToken throws an error for missing token', async () => {
    const result = validateToken('', 'http://test.com', 'get')
    expect(result).rejects.toThrow(Error)
  })

  test('validateToken throws an error for a wrong url', async () => {
    const validToken = await getToken('http://test.com', 'get', e => finalizeEvent(e, sk))

    const result = validateToken(validToken, 'http://wrong-test.com', 'get')
    expect(result).rejects.toThrow(Error)
  })

  test('validateToken throws an error for a wrong method', async () => {
    const validToken = await getToken('http://test.com', 'get', e => finalizeEvent(e, sk))

    const result = validateToken(validToken, 'http://test.com', 'post')
    expect(result).rejects.toThrow(Error)
  })

  test('validateEvent returns true for valid decoded token with authorization scheme', async () => {
    const validToken = await getToken('http://test.com', 'get', e => finalizeEvent(e, sk), true)
    const decodedResult: Event = await unpackEventFromToken(validToken)

    const result = await validateEvent(decodedResult, 'http://test.com', 'get')
    expect(result).toBe(true)
  })

  test('validateEvent throws an error for a wrong url', async () => {
    const validToken = await getToken('http://test.com', 'get', e => finalizeEvent(e, sk), true)
    const decodedResult: Event = await unpackEventFromToken(validToken)

    const result = validateEvent(decodedResult, 'http://wrong-test.com', 'get')
    expect(result).rejects.toThrow(Error)
  })

  test('validateEvent throws an error for a wrong method', async () => {
    const validToken = await getToken('http://test.com', 'get', e => finalizeEvent(e, sk), true)
    const decodedResult: Event = await unpackEventFromToken(validToken)

    const result = validateEvent(decodedResult, 'http://test.com', 'post')
    expect(result).rejects.toThrow(Error)
  })

  test('validateEvent returns true for valid payload tag hash', async () => {
    const validToken = await getToken('http://test.com', 'post', e => finalizeEvent(e, sk), true, { test: 'payload' })
    const decodedResult: Event = await unpackEventFromToken(validToken)

    const result = await validateEvent(decodedResult, 'http://test.com', 'post', { test: 'payload' })
    expect(result).toBe(true)
  })

  test('validateEvent returns false for invalid payload tag hash', async () => {
    const validToken = await getToken('http://test.com', 'post', e => finalizeEvent(e, sk), true, { test: 'a-payload' })
    const decodedResult: Event = await unpackEventFromToken(validToken)

    const result = validateEvent(decodedResult, 'http://test.com', 'post', { test: 'a-different-payload' })
    expect(result).rejects.toThrow(Error)
  })
})
