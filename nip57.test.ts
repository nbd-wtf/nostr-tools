import { describe, test, expect, mock } from 'bun:test'
import { finalizeEvent } from './pure.ts'
import { getPublicKey, generateSecretKey } from './pure.ts'
import {
  getZapEndpoint,
  makeZapReceipt,
  makeZapRequest,
  useFetchImplementation,
  validateZapReceipt,
  validateZapRequest,
} from './nip57.ts'
import { buildEvent } from './test-helpers.ts'

describe('getZapEndpoint', () => {
  test('returns null if neither lud06 nor lud16 is present', async () => {
    const metadata = buildEvent({ kind: 0, content: '{}' })
    const result = await getZapEndpoint(metadata)

    expect(result).toBeNull()
  })

  test('returns null if fetch fails', async () => {
    const fetchImplementation = mock(() => Promise.reject(new Error()))
    useFetchImplementation(fetchImplementation)

    const metadata = buildEvent({ kind: 0, content: '{"lud16": "name@domain"}' })
    const result = await getZapEndpoint(metadata)

    expect(result).toBeNull()
    expect(fetchImplementation).toHaveBeenCalledWith('https://domain/.well-known/lnurlp/name')
  })

  test('returns null if the response does not allow Nostr payments', async () => {
    const fetchImplementation = mock(() => Promise.resolve({ json: () => ({ allowsNostr: false }) }))
    useFetchImplementation(fetchImplementation)

    const metadata = buildEvent({ kind: 0, content: '{"lud16": "name@domain"}' })
    const result = await getZapEndpoint(metadata)

    expect(result).toBeNull()
    expect(fetchImplementation).toHaveBeenCalledWith('https://domain/.well-known/lnurlp/name')
  })

  test('returns the callback URL if the response allows Nostr payments', async () => {
    const fetchImplementation = mock(() =>
      Promise.resolve({
        json: () => ({
          allowsNostr: true,
          nostrPubkey: 'pubkey',
          callback: 'callback',
        }),
      }),
    )
    useFetchImplementation(fetchImplementation)

    const metadata = buildEvent({ kind: 0, content: '{"lud16": "name@domain"}' })
    const result = await getZapEndpoint(metadata)

    expect(result).toBe('callback')
    expect(fetchImplementation).toHaveBeenCalledWith('https://domain/.well-known/lnurlp/name')
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
        comment: '',
      }),
    ).toThrow()
  })

  test('throws an error if profile is not given', () => {
    expect(() =>
      // @ts-expect-error
      makeZapRequest({
        event: null,
        amount: 100,
        relays: [],
        comment: '',
      }),
    ).toThrow()
  })

  test('returns a valid Zap request', () => {
    const result = makeZapRequest({
      profile: 'profile',
      event: 'event',
      amount: 100,
      relays: ['relay1', 'relay2'],
      comment: 'comment',
    })
    expect(result.kind).toBe(9734)
    expect(result.created_at).toBeCloseTo(Date.now() / 1000, 0)
    expect(result.content).toBe('comment')
    expect(result.tags).toEqual(
      expect.arrayContaining([
        ['p', 'profile'],
        ['amount', '100'],
        ['relays', 'relay1', 'relay2'],
        ['e', 'event'],
      ]),
    )
  })
})

describe('validateZapRequest', () => {
  test('returns an error message for invalid JSON', () => {
    expect(validateZapRequest('invalid JSON')).toBe('Invalid zap request JSON.')
  })

  test('returns an error message if the Zap request is not a valid Nostr event', () => {
    const zapRequest = {
      kind: 1234,
      created_at: Date.now() / 1000,
      content: 'content',
      tags: [
        ['p', 'profile'],
        ['amount', '100'],
        ['relays', 'relay1', 'relay2'],
      ],
    }

    expect(validateZapRequest(JSON.stringify(zapRequest))).toBe('Zap request is not a valid Nostr event.')
  })

  test('returns an error message if the signature on the Zap request is invalid', () => {
    const privateKey = generateSecretKey()
    const publicKey = getPublicKey(privateKey)

    const zapRequest = {
      pubkey: publicKey,
      kind: 9734,
      created_at: Date.now() / 1000,
      content: 'content',
      tags: [
        ['p', publicKey],
        ['amount', '100'],
        ['relays', 'relay1', 'relay2'],
      ],
    }

    expect(validateZapRequest(JSON.stringify(zapRequest))).toBe('Invalid signature on zap request.')
  })

  test('returns an error message if the Zap request does not have a "p" tag', () => {
    const privateKey = generateSecretKey()
    const zapRequest = finalizeEvent(
      {
        kind: 9734,
        created_at: Date.now() / 1000,
        content: 'content',
        tags: [
          ['amount', '100'],
          ['relays', 'relay1', 'relay2'],
        ],
      },
      privateKey,
    )

    expect(validateZapRequest(JSON.stringify(zapRequest))).toBe("Zap request doesn't have a 'p' tag.")
  })

  test('returns an error message if the "p" tag on the Zap request is not valid hex', () => {
    const privateKey = generateSecretKey()
    const zapRequest = finalizeEvent(
      {
        kind: 9734,
        created_at: Date.now() / 1000,
        content: 'content',
        tags: [
          ['p', 'invalid hex'],
          ['amount', '100'],
          ['relays', 'relay1', 'relay2'],
        ],
      },
      privateKey,
    )

    expect(validateZapRequest(JSON.stringify(zapRequest))).toBe("Zap request 'p' tag is not valid hex.")
  })

  test('returns an error message if the "e" tag on the Zap request is not valid hex', () => {
    const privateKey = generateSecretKey()
    const publicKey = getPublicKey(privateKey)

    const zapRequest = finalizeEvent(
      {
        kind: 9734,
        created_at: Date.now() / 1000,
        content: 'content',
        tags: [
          ['p', publicKey],
          ['e', 'invalid hex'],
          ['amount', '100'],
          ['relays', 'relay1', 'relay2'],
        ],
      },
      privateKey,
    )

    expect(validateZapRequest(JSON.stringify(zapRequest))).toBe("Zap request 'e' tag is not valid hex.")
  })

  test('returns an error message if the Zap request does not have a relays tag', () => {
    const privateKey = generateSecretKey()
    const publicKey = getPublicKey(privateKey)

    const zapRequest = finalizeEvent(
      {
        kind: 9734,
        created_at: Date.now() / 1000,
        content: 'content',
        tags: [
          ['p', publicKey],
          ['amount', '100'],
        ],
      },
      privateKey,
    )

    expect(validateZapRequest(JSON.stringify(zapRequest))).toBe("Zap request doesn't have a 'relays' tag.")
  })

  test('returns null for a valid Zap request', () => {
    const privateKey = generateSecretKey()
    const publicKey = getPublicKey(privateKey)

    const zapRequest = finalizeEvent(
      {
        kind: 9734,
        created_at: Date.now() / 1000,
        content: 'content',
        tags: [
          ['p', publicKey],
          ['amount', '100'],
          ['relays', 'relay1', 'relay2'],
        ],
      },
      privateKey,
    )

    expect(validateZapRequest(JSON.stringify(zapRequest))).toBeNull()
  })
})

describe('makeZapReceipt', () => {
  const privateKey = generateSecretKey()
  const publicKey = getPublicKey(privateKey)
  const target = 'efeb5d6e74ce6ffea6cae4094a9f29c26b5c56d7b44fae9f490f3410fd708c45'

  test('returns a valid Zap receipt with a preimage', () => {
    const zapRequest = JSON.stringify(
      finalizeEvent(
        {
          kind: 9734,
          created_at: Date.now() / 1000,
          content: 'content',
          tags: [
            ['p', target],
            ['amount', '100'],
            ['relays', 'relay1', 'relay2'],
          ],
        },
        privateKey,
      ),
    )
    const preimage = 'preimage'
    const bolt11 = 'bolt11'
    const paidAt = new Date()

    const result = makeZapReceipt({ zapRequest, preimage, bolt11, paidAt })

    expect(result.kind).toBe(9735)
    expect(result.created_at).toBeCloseTo(paidAt.getTime() / 1000, 0)
    expect(result.content).toBe('')
    expect(result.tags).toEqual(
      expect.arrayContaining([
        ['bolt11', bolt11],
        ['description', zapRequest],
        ['p', target],
        ['P', publicKey],
        ['preimage', preimage],
      ]),
    )
  })

  test('returns a valid Zap receipt without a preimage', () => {
    const zapRequest = JSON.stringify(
      finalizeEvent(
        {
          kind: 9734,
          created_at: Date.now() / 1000,
          content: 'content',
          tags: [
            ['p', target],
            ['amount', '100'],
            ['relays', 'relay1', 'relay2'],
          ],
        },
        privateKey,
      ),
    )
    const bolt11 = 'bolt11'
    const paidAt = new Date()

    const result = makeZapReceipt({ zapRequest, bolt11, paidAt })

    expect(result.kind).toBe(9735)
    expect(result.created_at).toBeCloseTo(paidAt.getTime() / 1000, 0)
    expect(result.content).toBe('')
    expect(result.tags).toEqual(
      expect.arrayContaining([
        ['bolt11', bolt11],
        ['description', zapRequest],
        ['p', target],
        ['P', publicKey],
      ]),
    )
    expect(JSON.stringify(result.tags)).not.toContain('preimage')
  })
})

describe('validateZapReceipt', () => {
  test("returns an error message if zap receipt's pubkey does not match prodiver's nostrPubkey", async () => {
    const fetchImplementation = mock(() =>
      Promise.resolve({
        json: () => ({
          allowsNostr: true,
          nostrPubkey: 'pubkey2',
          callback: 'callback',
        }),
      }),
    )
    useFetchImplementation(fetchImplementation)

    const metadata = buildEvent({
      kind: 0,
      content: '{"lud06": "lnurl1dp68gurn8ghj7er0d4skjm309emk2mrv944kummhdchkcmn4wfk8qtmwv9kk2vkepaf"}',
    })

    const privateKey = generateSecretKey()
    const zapRequest = finalizeEvent(
      {
        kind: 9734,
        created_at: Date.now() / 1000,
        content: 'content',
        tags: [
          ['p', '47259076c85f9240e852420d7213c95e95102f1de929fb60f33a2c32570c98c4'],
          ['amount', '200000'],
          ['lnurl', 'lnurl1dp68gurn8ghj7er0d4skjm309emk2mrv944kummhdchkcmn4wfk8qtmwv9kk2vkepaf'],
          ['relays', 'relay1', 'relay2'],
        ],
      },
      privateKey,
    )
    const validZapReceipt = buildEvent({
      kind: 9735,
      pubkey: 'pubkey',
      tags: [
        ['p', '47259076c85f9240e852420d7213c95e95102f1de929fb60f33a2c32570c98c4'],
        ['e', '072b76e219cd616709a9731104937d281b93283702b019f048603654d876a06f'],
        ['P', '0c52bd52cc24adfef62f7fb9c641056a762fc1ec3e5be0bde4b79f3956e51665'],
        [
          'bolt11',
          'lnbc2u1pnx2pwspp5pzw8yj0ummke3g6hxufa8v84emdvj0ry8ds6wy98ch2cpdq89hgshp5usd6se5h59vuscladwuhgm8uxdp54vwyu6we8dp9hfkc8fqtpfzqcqzzsxqyz5vqsp5t8g4wst407pkuuwdy3f6yhtq49k5ewfdxxphfjy35edg925lfzzq9qyyssqs9x5g5pflvg3zc3ueygm5fmxxgqdw7lv0hkyjktr0dav3jurfkcnhpkptzhrywp7an0e825wv3w4znpmm0khdptq408nw6x3gusr3wspdasmay',
        ],
        ['preimage', '6bfacb20e12d6e4ea068ad39ed48392cd9bd7535e0d1bc185319494db0202709'],
        ['description', JSON.stringify(zapRequest)],
      ],
    })
    expect(await validateZapReceipt(validZapReceipt, metadata)).toBe(
      "Zap receipt's pubkey does not match lnurl provider's nostrPubkey.",
    )
  })

  test('returns null for a valid Zap receipt', async () => {
    const fetchImplementation = mock(() =>
      Promise.resolve({
        json: () => ({
          allowsNostr: true,
          nostrPubkey: 'pubkey',
          callback: 'callback',
        }),
      }),
    )
    useFetchImplementation(fetchImplementation)

    const metadata = buildEvent({
      kind: 0,
      content: '{"lud06": "lnurl1dp68gurn8ghj7er0d4skjm309emk2mrv944kummhdchkcmn4wfk8qtmwv9kk2vkepaf"}',
    })

    const privateKey = generateSecretKey()
    const zapRequest = finalizeEvent(
      {
        kind: 9734,
        created_at: Date.now() / 1000,
        content: 'content',
        tags: [
          ['p', '47259076c85f9240e852420d7213c95e95102f1de929fb60f33a2c32570c98c4'],
          ['amount', '200000'],
          ['lnurl', 'lnurl1dp68gurn8ghj7er0d4skjm309emk2mrv944kummhdchkcmn4wfk8qtmwv9kk2vkepaf'],
          ['relays', 'relay1', 'relay2'],
        ],
      },
      privateKey,
    )
    const validZapReceipt = buildEvent({
      kind: 9735,
      pubkey: 'pubkey',
      tags: [
        ['p', '47259076c85f9240e852420d7213c95e95102f1de929fb60f33a2c32570c98c4'],
        ['e', '072b76e219cd616709a9731104937d281b93283702b019f048603654d876a06f'],
        ['P', '0c52bd52cc24adfef62f7fb9c641056a762fc1ec3e5be0bde4b79f3956e51665'],
        [
          'bolt11',
          'lnbc2u1pnx2pwspp5pzw8yj0ummke3g6hxufa8v84emdvj0ry8ds6wy98ch2cpdq89hgshp5usd6se5h59vuscladwuhgm8uxdp54vwyu6we8dp9hfkc8fqtpfzqcqzzsxqyz5vqsp5t8g4wst407pkuuwdy3f6yhtq49k5ewfdxxphfjy35edg925lfzzq9qyyssqs9x5g5pflvg3zc3ueygm5fmxxgqdw7lv0hkyjktr0dav3jurfkcnhpkptzhrywp7an0e825wv3w4znpmm0khdptq408nw6x3gusr3wspdasmay',
        ],
        ['preimage', '6bfacb20e12d6e4ea068ad39ed48392cd9bd7535e0d1bc185319494db0202709'],
        ['description', JSON.stringify(zapRequest)],
      ],
    })
    expect(await validateZapReceipt(validZapReceipt, metadata)).toBe(null)
  })
})
