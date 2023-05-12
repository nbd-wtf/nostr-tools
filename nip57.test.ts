import {finishEvent} from './event.ts'
import {getPublicKey, generatePrivateKey} from './keys.ts'
import {
  getZapEndpoint,
  makeZapReceipt,
  makeZapRequest,
  useFetchImplementation,
  validateZapRequest,
} from './nip57.ts'
import {buildEvent} from './test-helpers.ts'

describe('getZapEndpoint', () => {
  test('returns null if neither lud06 nor lud16 is present', async () => {
    const metadata = buildEvent({kind: 0, content: '{}'})
    const result = await getZapEndpoint(metadata)

    expect(result).toBeNull()
  })

  test('returns null if fetch fails', async () => {
    const fetchImplementation = jest.fn(() => Promise.reject(new Error()))
    useFetchImplementation(fetchImplementation)

    const metadata = buildEvent({kind: 0, content: '{"lud16": "name@domain"}'})
    const result = await getZapEndpoint(metadata)

    expect(result).toBeNull()
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://domain/.well-known/lnurlp/name'
    )
  })

  test('returns null if the response does not allow Nostr payments', async () => {
    const fetchImplementation = jest.fn(() =>
      Promise.resolve({json: () => ({allowsNostr: false})})
    )
    useFetchImplementation(fetchImplementation)

    const metadata = buildEvent({kind: 0, content: '{"lud16": "name@domain"}'})
    const result = await getZapEndpoint(metadata)

    expect(result).toBeNull()
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://domain/.well-known/lnurlp/name'
    )
  })

  test('returns the callback URL if the response allows Nostr payments', async () => {
    const fetchImplementation = jest.fn(() =>
      Promise.resolve({
        json: () => ({
          allowsNostr: true,
          nostrPubkey: 'pubkey',
          callback: 'callback'
        })
      })
    )
    useFetchImplementation(fetchImplementation)

    const metadata = buildEvent({kind: 0, content: '{"lud16": "name@domain"}'})
    const result = await getZapEndpoint(metadata)

    expect(result).toBe('callback')
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://domain/.well-known/lnurlp/name'
    )
  })
})

describe('makeZapRequest', () => {
  test('throws an error if amount is not given', () => {
    expect(() =>
      // @ts-expect-error
      makeZapRequest({
        profile: 'profile',
        event: null,
        relays: [],
        comment: ''
      })
    ).toThrow()
  })

  test('throws an error if profile is not given', () => {
    expect(() =>
      // @ts-expect-error
      makeZapRequest({
        event: null,
        amount: 100,
        relays: [],
        comment: ''
      })
    ).toThrow()
  })

  test('returns a valid Zap request', () => {
    const result = makeZapRequest({
      profile: 'profile',
      event: 'event',
      amount: 100,
      relays: ['relay1', 'relay2'],
      comment: 'comment'
    })
    expect(result.kind).toBe(9734)
    expect(result.created_at).toBeCloseTo(Date.now() / 1000, 0)
    expect(result.content).toBe('comment')
    expect(result.tags).toEqual(
      expect.arrayContaining([
        ['p', 'profile'],
        ['amount', '100'],
        ['relays', 'relay1', 'relay2']
      ])
    )
    expect(result.tags).toContainEqual(['e', 'event'])
  })
})

describe('validateZapRequest', () => {
  test('returns an error message for invalid JSON', () => {
    expect(validateZapRequest('invalid JSON')).toBe(
      'Invalid zap request JSON.'
    )
  })

  test('returns an error message if the Zap request is not a valid Nostr event', () => {
    const zapRequest = {
      kind: 1234,
      created_at: Date.now() / 1000,
      content: 'content',
      tags: [
        ['p', 'profile'],
        ['amount', '100'],
        ['relays', 'relay1', 'relay2']
      ]
    }

    expect(validateZapRequest(JSON.stringify(zapRequest))).toBe(
      'Zap request is not a valid Nostr event.'
    )
  })

  test('returns an error message if the signature on the Zap request is invalid', () => {
    const privateKey = generatePrivateKey()
    const publicKey = getPublicKey(privateKey)

    const zapRequest = {
      pubkey: publicKey,
      kind: 9734,
      created_at: Date.now() / 1000,
      content: 'content',
      tags: [
        ['p', publicKey],
        ['amount', '100'],
        ['relays', 'relay1', 'relay2']
      ]
    }

    expect(validateZapRequest(JSON.stringify(zapRequest))).toBe(
      'Invalid signature on zap request.'
    )
  })

  test('returns an error message if the Zap request does not have a "p" tag', () => {
    const privateKey = generatePrivateKey()

    const zapRequest = finishEvent(
      {
        kind: 9734,
        created_at: Date.now() / 1000,
        content: 'content',
        tags: [
          ['amount', '100'],
          ['relays', 'relay1', 'relay2']
        ]
      },
      privateKey
    )

    expect(validateZapRequest(JSON.stringify(zapRequest))).toBe(
      "Zap request doesn't have a 'p' tag."
    )
  })

  test('returns an error message if the "p" tag on the Zap request is not valid hex', () => {
    const privateKey = generatePrivateKey()

    const zapRequest = finishEvent(
      {
        kind: 9734,
        created_at: Date.now() / 1000,
        content: 'content',
        tags: [
          ['p', 'invalid hex'],
          ['amount', '100'],
          ['relays', 'relay1', 'relay2']
        ]
      },
      privateKey
    )

    expect(validateZapRequest(JSON.stringify(zapRequest))).toBe(
      "Zap request 'p' tag is not valid hex."
    )
  })

  test('returns an error message if the "e" tag on the Zap request is not valid hex', () => {
    const privateKey = generatePrivateKey()
    const publicKey = getPublicKey(privateKey)

    const zapRequest = finishEvent(
      {
        kind: 9734,
        created_at: Date.now() / 1000,
        content: 'content',
        tags: [
          ['p', publicKey],
          ['e', 'invalid hex'],
          ['amount', '100'],
          ['relays', 'relay1', 'relay2']
        ]
      },
      privateKey
    )

    expect(validateZapRequest(JSON.stringify(zapRequest))).toBe(
      "Zap request 'e' tag is not valid hex."
    )
  })

  test('returns an error message if the Zap request does not have a relays tag', () => {
    const privateKey = generatePrivateKey()
    const publicKey = getPublicKey(privateKey)

    const zapRequest = finishEvent(
      {
        kind: 9734,
        created_at: Date.now() / 1000,
        content: 'content',
        tags: [
          ['p', publicKey],
          ['amount', '100']
        ]
      },
      privateKey
    )

    expect(validateZapRequest(JSON.stringify(zapRequest))).toBe(
      "Zap request doesn't have a 'relays' tag."
    )
  })

  test('returns null for a valid Zap request', () => {
    const privateKey = generatePrivateKey()
    const publicKey = getPublicKey(privateKey)

    const zapRequest = finishEvent(
      {
        kind: 9734,
        created_at: Date.now() / 1000,
        content: 'content',
        tags: [
          ['p', publicKey],
          ['amount', '100'],
          ['relays', 'relay1', 'relay2']
        ]
      },
      privateKey
    )

    expect(validateZapRequest(JSON.stringify(zapRequest))).toBeNull()
  })
})

describe('makeZapReceipt', () => {
  test('returns a valid Zap receipt with a preimage', () => {
    const privateKey = generatePrivateKey()
    const publicKey = getPublicKey(privateKey)

    const zapRequest = JSON.stringify(
      finishEvent(
        {
          kind: 9734,
          created_at: Date.now() / 1000,
          content: 'content',
          tags: [
            ['p', publicKey],
            ['amount', '100'],
            ['relays', 'relay1', 'relay2']
          ]
        },
        privateKey
      )
    )
    const preimage = 'preimage'
    const bolt11 = 'bolt11'
    const paidAt = new Date()

    const result = makeZapReceipt({zapRequest, preimage, bolt11, paidAt})

    expect(result.kind).toBe(9735)
    expect(result.created_at).toBeCloseTo(paidAt.getTime() / 1000, 0)
    expect(result.content).toBe('')
    expect(result.tags).toContainEqual(['bolt11', bolt11])
    expect(result.tags).toContainEqual(['description', zapRequest])
    expect(result.tags).toContainEqual(['p', publicKey])
    expect(result.tags).toContainEqual(['preimage', preimage])
  })

  test('returns a valid Zap receipt without a preimage', () => {
    const privateKey = generatePrivateKey()
    const publicKey = getPublicKey(privateKey)

    const zapRequest = JSON.stringify(
      finishEvent(
        {
          kind: 9734,
          created_at: Date.now() / 1000,
          content: 'content',
          tags: [
            ['p', publicKey],
            ['amount', '100'],
            ['relays', 'relay1', 'relay2']
          ]
        },
        privateKey
      )
    )
    const bolt11 = 'bolt11'
    const paidAt = new Date()

    const result = makeZapReceipt({zapRequest, bolt11, paidAt})

    expect(result.kind).toBe(9735)
    expect(result.created_at).toBeCloseTo(paidAt.getTime() / 1000, 0)
    expect(result.content).toBe('')
    expect(result.tags).toContainEqual(['bolt11', bolt11])
    expect(result.tags).toContainEqual(['description', zapRequest])
    expect(result.tags).toContainEqual(['p', publicKey])
    expect(result.tags).not.toContain('preimage')
  })
})
