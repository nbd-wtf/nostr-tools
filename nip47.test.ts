import { describe, test, expect } from 'bun:test'
import { hexToBytes } from '@noble/hashes/utils'
import { makeNwcRequestEvent, parseConnectionString } from './nip47.ts'
import { decrypt } from './nip04.ts'
import { NWCWalletRequest } from './kinds.ts'

describe('parseConnectionString', () => {
  test('returns pubkey, relay, and secret if connection string is valid', () => {
    const connectionString =
      'nostr+walletconnect:b889ff5b1513b641e2a139f661a661364979c5beee91842f8f0ef42ab558e9d4?relay=wss%3A%2F%2Frelay.damus.io&secret=71a8c14c1407c113601079c4302dab36460f0ccd0ad506f1f2dc73b5100e4f3c'
    const { pubkey, relay, secret } = parseConnectionString(connectionString)

    expect(pubkey).toBe('b889ff5b1513b641e2a139f661a661364979c5beee91842f8f0ef42ab558e9d4')
    expect(relay).toBe('wss://relay.damus.io')
    expect(secret).toBe('71a8c14c1407c113601079c4302dab36460f0ccd0ad506f1f2dc73b5100e4f3c')
  })

  test('throws an error if no pubkey in connection string', async () => {
    const connectionString =
      'nostr+walletconnect:relay=wss%3A%2F%2Frelay.damus.io&secret=71a8c14c1407c113601079c4302dab36460f0ccd0ad506f1f2dc73b5100e4f3c'

    expect(() => parseConnectionString(connectionString)).toThrow('invalid connection string')
  })

  test('throws an error if no relay in connection string', async () => {
    const connectionString =
      'nostr+walletconnect:b889ff5b1513b641e2a139f661a661364979c5beee91842f8f0ef42ab558e9d4?secret=71a8c14c1407c113601079c4302dab36460f0ccd0ad506f1f2dc73b5100e4f3c'

    expect(() => parseConnectionString(connectionString)).toThrow('invalid connection string')
  })

  test('throws an error if no secret in connection string', async () => {
    const connectionString =
      'nostr+walletconnect:b889ff5b1513b641e2a139f661a661364979c5beee91842f8f0ef42ab558e9d4?relay=wss%3A%2F%2Frelay.damus.io'

    expect(() => parseConnectionString(connectionString)).toThrow('invalid connection string')
  })
})

describe('makeNwcRequestEvent', () => {
  test('returns a valid NWC request event', async () => {
    const pubkey = 'b889ff5b1513b641e2a139f661a661364979c5beee91842f8f0ef42ab558e9d4'
    const secret = hexToBytes('71a8c14c1407c113601079c4302dab36460f0ccd0ad506f1f2dc73b5100e4f3c')
    const invoice =
      'lnbc210n1pjdgyvupp5x43awdarnfd4mdlsklelux0nyckwfu5c708ykuet8vcjnjp3rnpqdqu2askcmr9wssx7e3q2dshgmmndp5scqzzsxqyz5vqsp52l7y9peq9pka3vd3j7aps7gjnalsmy46ndj2mlkz00dltjgqfumq9qyyssq5fasr5dxed8l4qjfnqq48a02jzss3asf8sly7sfaqtr9w3yu2q9spsxhghs3y9aqdf44zkrrg9jjjdg6amade4h0hulllkwk33eqpucp6d5jye'
    const result = await makeNwcRequestEvent(pubkey, secret, invoice)
    expect(result.kind).toBe(NWCWalletRequest)
    expect(await decrypt(secret, pubkey, result.content)).toEqual(
      JSON.stringify({
        method: 'pay_invoice',
        params: {
          invoice,
        },
      }),
    )
    expect(result.tags).toEqual([['p', pubkey]])
    expect(result.id).toEqual(expect.any(String))
    expect(result.sig).toEqual(expect.any(String))
  })
})
