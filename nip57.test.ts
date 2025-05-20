import { describe, test, expect, mock } from 'bun:test'
import { finalizeEvent } from './pure.ts'
import { getPublicKey, generateSecretKey } from './pure.ts'
import {
  getSatoshisAmountFromBolt11,
  getZapEndpoint,
  makeZapReceipt,
  makeZapRequest,
  useFetchImplementation,
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

test('parses the amount from bolt11 invoices', () => {
  expect(
    getSatoshisAmountFromBolt11(
      'lnbc4u1p5zcarnpp5djng98r73nxu66nxp6gndjkw24q7rdzgp7p80lt0gk4z3h3krkssdq9tfpygcqzzsxqzjcsp58hz3v5qefdm70g5fnm2cn6q9thzpu6m4f5wjqurhur5xzmf9vl3s9qxpqysgq9v6qv86xaruzeak9jjyz54fygrkn526z7xhm0llh8wl44gcgh0rznhjqdswd4cjurzdgh0pgzrfj4sd7f3mf89jd6kadse008ex7kxgqqa5xrk',
    ),
  ).toEqual(400)
  expect(
    getSatoshisAmountFromBolt11(
      'lnbc8400u1p5zcaz5pp5ltvyhtg4ed7sd8jurj28ugmavezkmqsadpe3t9npufpcrd0uet0scqzyssp5l3hz4ayt5ee0p83ma4a96l2rruhx33eyycewldu2ffa5pk2qx7jq9q7sqqqqqqqqqqqqqqqqqqqsqqqqqysgqdq8w3jhxaqmqz9gxqyjw5qrzjqwryaup9lh50kkranzgcdnn2fgvx390wgj5jd07rwr3vxeje0glclll8qkt3np4rqyqqqqlgqqqqqeqqjqhuhjk5u9r850ncxngne7cfp9s08s2nm6c2rkz7jhl8gjmlx0fga5tlncgeuh4avlsrkq6ljyyhgq8rrxprga03esqhd0gf5455x6tdcqahhw9q',
    ),
  ).toEqual(840000)
  expect(
    getSatoshisAmountFromBolt11(
      'lnbc210n1p5zcuaxpp52nn778cfk46md4ld0hdj2juuzvfrsrdaf4ek2k0yeensae07x2cqdq9tfpygcqzzsxqzjcsp5768c4k79jtnq92pgppan8rjnujcpcqhnqwqwk3lm5dfr7e0k2a7s9qxpqysgqt8lnh9l7ple27t73x7gty570ltas2s33uahc7egke5tdmhxr3ezn590wf2utxyt7d3afnk2lxc2u0enc6n53ck4mxwpmzpxa7ws05aqp0c5x3r',
    ),
  ).toEqual(21)
  expect(
    getSatoshisAmountFromBolt11(
      'lnbc899640n1p5zcuavpp5w72fqrf09286lq33vw364qryrq5nw60z4dhdx56f8w05xkx4massdq9tfpygcqzzsxqzjcsp5qrqn4kpvem5jwpl63kj5pfdlqxg2plaffz0prz7vaqjy29uc66us9qxpqysgqlhzzqmn2jxd2476404krm8nvrarymwq7nj2zecl92xug54ek0mfntdxvxwslf756m8kq0r7jtpantm52fmewc72r5lfmd85505jnemgqw5j0pc',
    ),
  ).toEqual(89964)
})
