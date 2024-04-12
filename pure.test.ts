import { describe, test, expect } from 'bun:test'

import {
  finalizeEvent,
  serializeEvent,
  getEventHash,
  validateEvent,
  verifyEvent,
  verifiedSymbol,
  getPublicKey,
  generateSecretKey,
} from './pure.ts'
import { ShortTextNote } from './kinds.ts'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'

test('private key generation', () => {
  expect(bytesToHex(generateSecretKey())).toMatch(/[a-f0-9]{64}/)
})

test('public key generation', () => {
  expect(getPublicKey(generateSecretKey())).toMatch(/[a-f0-9]{64}/)
})

test('public key from private key deterministic', () => {
  let sk = generateSecretKey()
  let pk = getPublicKey(sk)

  for (let i = 0; i < 5; i++) {
    expect(getPublicKey(sk)).toEqual(pk)
  }
})

describe('finalizeEvent', () => {
  test('should create a signed event from a template', () => {
    const privateKey = hexToBytes('d217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf')
    const publicKey = getPublicKey(privateKey)

    const template = {
      kind: ShortTextNote,
      tags: [],
      content: 'Hello, world!',
      created_at: 1617932115,
    }

    const event = finalizeEvent(template, privateKey)

    expect(event.kind).toEqual(template.kind)
    expect(event.tags).toEqual(template.tags)
    expect(event.content).toEqual(template.content)
    expect(event.created_at).toEqual(template.created_at)
    expect(event.pubkey).toEqual(publicKey)
    expect(typeof event.id).toEqual('string')
    expect(typeof event.sig).toEqual('string')
  })
})

describe('serializeEvent', () => {
  test('should serialize a valid event object', () => {
    const privateKey = hexToBytes('d217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf')
    const publicKey = getPublicKey(privateKey)

    const unsignedEvent = {
      pubkey: publicKey,
      created_at: 1617932115,
      kind: ShortTextNote,
      tags: [],
      content: 'Hello, world!',
    }

    const serializedEvent = serializeEvent(unsignedEvent)

    expect(serializedEvent).toEqual(
      JSON.stringify([
        0,
        publicKey,
        unsignedEvent.created_at,
        unsignedEvent.kind,
        unsignedEvent.tags,
        unsignedEvent.content,
      ]),
    )
  })

  test('should throw an error for an invalid event object', () => {
    const privateKey = hexToBytes('d217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf')
    const publicKey = getPublicKey(privateKey)

    const invalidEvent = {
      kind: ShortTextNote,
      tags: [],
      created_at: 1617932115,
      pubkey: publicKey, // missing content
    }

    expect(() => {
      // @ts-expect-error
      serializeEvent(invalidEvent)
    }).toThrow("can't serialize event with wrong or missing properties")
  })
})

describe('getEventHash', () => {
  test('should return the correct event hash', () => {
    const privateKey = hexToBytes('d217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf')
    const publicKey = getPublicKey(privateKey)

    const unsignedEvent = {
      kind: ShortTextNote,
      tags: [],
      content: 'Hello, world!',
      created_at: 1617932115,
      pubkey: publicKey,
    }

    const eventHash = getEventHash(unsignedEvent)

    expect(typeof eventHash).toEqual('string')
    expect(eventHash.length).toEqual(64)
  })
})

describe('validateEvent', () => {
  test('should return true for a valid event object', () => {
    const privateKey = hexToBytes('d217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf')
    const publicKey = getPublicKey(privateKey)

    const unsignedEvent = {
      kind: ShortTextNote,
      tags: [],
      content: 'Hello, world!',
      created_at: 1617932115,
      pubkey: publicKey,
    }

    const isValid = validateEvent(unsignedEvent)

    expect(isValid).toEqual(true)
  })

  test('should return false for a non object event', () => {
    const nonObjectEvent = ''
    const isValid = validateEvent(nonObjectEvent)
    expect(isValid).toEqual(false)
  })

  test('should return false for an event object with missing properties', () => {
    const invalidEvent = {
      kind: ShortTextNote,
      tags: [],
      created_at: 1617932115, // missing content and pubkey
    }

    const isValid = validateEvent(invalidEvent)

    expect(isValid).toEqual(false)
  })

  test('should return false for an empty object', () => {
    const emptyObj = {}

    const isValid = validateEvent(emptyObj)

    expect(isValid).toEqual(false)
  })

  test('should return false for an object with invalid properties', () => {
    const privateKey = hexToBytes('d217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf')
    const publicKey = getPublicKey(privateKey)

    const invalidEvent = {
      kind: 1,
      tags: [],
      created_at: '1617932115', // should be a number
      pubkey: publicKey,
    }

    const isValid = validateEvent(invalidEvent)

    expect(isValid).toEqual(false)
  })

  test('should return false for an object with an invalid public key', () => {
    const invalidEvent = {
      kind: 1,
      tags: [],
      content: 'Hello, world!',
      created_at: 1617932115,
      pubkey: 'invalid_pubkey',
    }

    const isValid = validateEvent(invalidEvent)

    expect(isValid).toEqual(false)
  })

  test('should return false for an object with invalid tags', () => {
    const privateKey = hexToBytes('d217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf')
    const publicKey = getPublicKey(privateKey)

    const invalidEvent = {
      kind: 1,
      tags: {}, // should be an array
      content: 'Hello, world!',
      created_at: 1617932115,
      pubkey: publicKey,
    }

    const isValid = validateEvent(invalidEvent)

    expect(isValid).toEqual(false)
  })
})

describe('verifyEvent', () => {
  test('should return true for a valid event signature', () => {
    const privateKey = hexToBytes('d217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf')
    const event = finalizeEvent(
      {
        kind: ShortTextNote,
        tags: [],
        content: 'Hello, world!',
        created_at: 1617932115,
      },
      privateKey,
    )

    const isValid = verifyEvent(event)
    expect(isValid).toEqual(true)
  })

  test('should return false for an invalid event signature', () => {
    const privateKey = hexToBytes('d217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf')
    const { [verifiedSymbol]: _, ...event } = finalizeEvent(
      {
        kind: ShortTextNote,
        tags: [],
        content: 'Hello, world!',
        created_at: 1617932115,
      },
      privateKey,
    )

    // tamper with the signature
    event.sig = event.sig.replace(/^.{3}/g, '666')

    const isValid = verifyEvent(event)
    expect(isValid).toEqual(false)
  })

  test('should return false when verifying an event with a different private key', () => {
    const privateKey1 = hexToBytes('d217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf')

    const privateKey2 = hexToBytes('5b4a34f4e4b23c63ad55a35e3f84a3b53d96dbf266edf521a8358f71d19cbf67')
    const publicKey2 = getPublicKey(privateKey2)

    const { [verifiedSymbol]: _, ...event } = finalizeEvent(
      {
        kind: ShortTextNote,
        tags: [],
        content: 'Hello, world!',
        created_at: 1617932115,
      },
      privateKey1,
    )

    // verify with different private key
    const isValid = verifyEvent({
      ...event,
      pubkey: publicKey2,
    })
    expect(isValid).toEqual(false)
  })

  test('should return false for an invalid event id', () => {
    const privateKey = hexToBytes('d217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf')

    const { [verifiedSymbol]: _, ...event } = finalizeEvent(
      {
        kind: 1,
        tags: [],
        content: 'Hello, world!',
        created_at: 1617932115,
      },
      privateKey,
    )

    // tamper with the id
    event.id = event.id.replace(/^.{3}/g, '666')

    const isValid = verifyEvent(event)
    expect(isValid).toEqual(false)
  })
})
