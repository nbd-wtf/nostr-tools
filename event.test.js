const {
  getBlankEvent,
  finishEvent,
  serializeEvent,
  getEventHash,
  validateEvent,
  verifySignature,
  getSignature,
  getPublicKey,
  Kind
} = require('./lib/nostr.cjs')

describe('Event', () => {
  describe('getBlankEvent', () => {
    it('should return a blank event object', () => {
      expect(getBlankEvent()).toEqual({
        kind: 255,
        content: '',
        tags: [],
        created_at: 0
      })
    })

    it('should return a blank event object with defined kind', () => {
      expect(getBlankEvent(Kind.Text)).toEqual({
        kind: 1,
        content: '',
        tags: [],
        created_at: 0
      })
    })
  })

  describe('finishEvent', () => {
    it('should create a signed event from a template', () => {
      const privateKey =
        'd217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf'
      const publicKey = getPublicKey(privateKey)

      const template = {
        kind: Kind.Text,
        tags: [],
        content: 'Hello, world!',
        created_at: 1617932115
      }

      const event = finishEvent(template, privateKey)

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
    it('should serialize a valid event object', () => {
      const privateKey =
        'd217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf'
      const publicKey = getPublicKey(privateKey)

      const unsignedEvent = {
        pubkey: publicKey,
        created_at: 1617932115,
        kind: Kind.Text,
        tags: [],
        content: 'Hello, world!'
      }

      const serializedEvent = serializeEvent(unsignedEvent)

      expect(serializedEvent).toEqual(
        JSON.stringify([
          0,
          publicKey,
          unsignedEvent.created_at,
          unsignedEvent.kind,
          unsignedEvent.tags,
          unsignedEvent.content
        ])
      )
    })

    it('should throw an error for an invalid event object', () => {
      const privateKey =
        'd217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf'
      const publicKey = getPublicKey(privateKey)

      const invalidEvent = {
        kind: Kind.Text,
        tags: [],
        created_at: 1617932115,
        pubkey: publicKey // missing content
      }

      expect(() => {
        serializeEvent(invalidEvent)
      }).toThrow("can't serialize event with wrong or missing properties")
    })
  })

  describe('getEventHash', () => {
    it('should return the correct event hash', () => {
      const privateKey =
        'd217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf'
      const publicKey = getPublicKey(privateKey)

      const unsignedEvent = {
        kind: Kind.Text,
        tags: [],
        content: 'Hello, world!',
        created_at: 1617932115,
        pubkey: publicKey
      }

      const eventHash = getEventHash(unsignedEvent)

      expect(typeof eventHash).toEqual('string')
      expect(eventHash.length).toEqual(64)
    })
  })

  describe('validateEvent', () => {
    it('should return true for a valid event object', () => {
      const privateKey =
        'd217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf'
      const publicKey = getPublicKey(privateKey)

      const unsignedEvent = {
        kind: Kind.Text,
        tags: [],
        content: 'Hello, world!',
        created_at: 1617932115,
        pubkey: publicKey
      }

      const isValid = validateEvent(unsignedEvent)

      expect(isValid).toEqual(true)
    })

    it('should return false for a non object event', () => {
      const nonObjectEvent = ''

      const isValid = validateEvent(nonObjectEvent)

      expect(isValid).toEqual(false)
    })

    it('should return false for an event object with missing properties', () => {
      const invalidEvent = {
        kind: Kind.Text,
        tags: [],
        created_at: 1617932115 // missing content and pubkey
      }

      const isValid = validateEvent(invalidEvent)

      expect(isValid).toEqual(false)
    })

    it('should return false for an empty object', () => {
      const emptyObj = {}

      const isValid = validateEvent(emptyObj)

      expect(isValid).toEqual(false)
    })

    it('should return false for an object with invalid properties', () => {
      const privateKey =
        'd217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf'
      const publicKey = getPublicKey(privateKey)

      const invalidEvent = {
        kind: 1,
        tags: [],
        created_at: '1617932115', // should be a number
        pubkey: publicKey
      }

      const isValid = validateEvent(invalidEvent)

      expect(isValid).toEqual(false)
    })

    it('should return false for an object with an invalid public key', () => {
      const invalidEvent = {
        kind: 1,
        tags: [],
        content: 'Hello, world!',
        created_at: 1617932115,
        pubkey: 'invalid_pubkey'
      }

      const isValid = validateEvent(invalidEvent)

      expect(isValid).toEqual(false)
    })

    it('should return false for an object with invalid tags', () => {
      const privateKey =
        'd217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf'
      const publicKey = getPublicKey(privateKey)

      const invalidEvent = {
        kind: 1,
        tags: {}, // should be an array
        content: 'Hello, world!',
        created_at: 1617932115,
        pubkey: publicKey
      }

      const isValid = validateEvent(invalidEvent)

      expect(isValid).toEqual(false)
    })
  })

  describe('verifySignature', () => {
    it('should return true for a valid event signature', () => {
      const privateKey =
        'd217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf'

      const event = finishEvent(
        {
          kind: Kind.Text,
          tags: [],
          content: 'Hello, world!',
          created_at: 1617932115
        },
        privateKey
      )

      const isValid = verifySignature(event)

      expect(isValid).toEqual(true)
    })

    it('should return false for an invalid event signature', () => {
      const privateKey =
        'd217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf'

      const event = finishEvent(
        {
          kind: Kind.Text,
          tags: [],
          content: 'Hello, world!',
          created_at: 1617932115
        },
        privateKey
      )

      // tamper with the signature
      event.sig = event.sig.replace(/0/g, '1')

      const isValid = verifySignature(event)

      expect(isValid).toEqual(false)
    })

    it('should return false when verifying an event with a different private key', () => {
      const privateKey1 =
        'd217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf'

      const privateKey2 =
        '5b4a34f4e4b23c63ad55a35e3f84a3b53d96dbf266edf521a8358f71d19cbf67'
      const publicKey2 = getPublicKey(privateKey2)

      const event = finishEvent(
        {
          kind: Kind.Text,
          tags: [],
          content: 'Hello, world!',
          created_at: 1617932115
        },
        privateKey1
      )

      // verify with different private key
      const isValid = verifySignature({
        ...event,
        pubkey: publicKey2
      })

      expect(isValid).toEqual(false)
    })
  })

  describe('getSignature', () => {
    it('should produce the correct signature for an event object', () => {
      const privateKey =
        'd217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf'
      const publicKey = getPublicKey(privateKey)

      const unsignedEvent = {
        kind: Kind.Text,
        tags: [],
        content: 'Hello, world!',
        created_at: 1617932115,
        pubkey: publicKey
      }

      const sig = getSignature(unsignedEvent, privateKey)

      // verify the signature
      const isValid = verifySignature({
        ...unsignedEvent,
        sig
      })

      expect(typeof sig).toEqual('string')
      expect(sig.length).toEqual(128)
      expect(isValid).toEqual(true)
    })

    it('should not sign an event with different private key', () => {
      const privateKey =
        'd217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf'
      const publicKey = getPublicKey(privateKey)

      const wrongPrivateKey =
        'a91e2a9d9e0f70f0877bea0dbf034e8f95d7392a27a7f07da0d14b9e9d456be7'

      const unsignedEvent = {
        kind: Kind.Text,
        tags: [],
        content: 'Hello, world!',
        created_at: 1617932115,
        pubkey: publicKey
      }

      const sig = getSignature(unsignedEvent, wrongPrivateKey)

      // verify the signature
      const isValid = verifySignature({
        ...unsignedEvent,
        sig
      })

      expect(typeof sig).toEqual('string')
      expect(sig.length).toEqual(128)
      expect(isValid).toEqual(false)
    })
  })
})
