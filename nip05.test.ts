import { test, expect } from 'bun:test'

import { useFetchImplementation, queryProfile, NIP05_REGEX, isNip05 } from './nip05.ts'

test('validate NIP05_REGEX', () => {
  expect(NIP05_REGEX.test('_@bob.com.br')).toBeTrue()
  expect(NIP05_REGEX.test('bob@bob.com.br')).toBeTrue()
  expect(NIP05_REGEX.test('b&b@bob.com.br')).toBeFalse()

  expect('b&b@bob.com.br'.match(NIP05_REGEX)).toBeNull()
  expect(Array.from('bob@bob.com.br'.match(NIP05_REGEX) || [])).toEqual(['bob@bob.com.br', 'bob', 'bob.com.br', '.br'])

  expect(isNip05('bob@bob.com.br')).toBeTrue()
  expect(isNip05('b&b@bob.com.br')).toBeFalse()
})

test('fetch nip05 profiles', async () => {
  const fetchStub = async (url: string) => ({
    status: 200,
    async json() {
      return {
        'https://compile-error.net/.well-known/nostr.json?name=_': {
          names: { _: '2c7cc62a697ea3a7826521f3fd34f0cb273693cbe5e9310f35449f43622a5cdc' },
        },
        'https://fiatjaf.com/.well-known/nostr.json?name=_': {
          names: { _: '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d' },
          relays: {
            '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d': [
              'wss://pyramid.fiatjaf.com',
              'wss://nos.lol',
            ],
          },
        },
      }[url]
    },
  })

  useFetchImplementation(fetchStub)

  let p2 = await queryProfile('compile-error.net')
  expect(p2!.pubkey).toEqual('2c7cc62a697ea3a7826521f3fd34f0cb273693cbe5e9310f35449f43622a5cdc')

  let p3 = await queryProfile('_@fiatjaf.com')
  expect(p3!.pubkey).toEqual('3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d')
  expect(p3!.relays).toEqual(['wss://pyramid.fiatjaf.com', 'wss://nos.lol'])
})
