import { test, expect } from 'bun:test'
import fetch from 'node-fetch'

import { useFetchImplementation, queryProfile, NIP05_REGEX, isNip05 } from './nip05.ts'

test('fetch nip05 profiles', async () => {
  useFetchImplementation(fetch)

  let p1 = await queryProfile('jb55.com')
  expect(p1!.pubkey).toEqual('32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245')
  expect(p1!.relays).toEqual(['wss://relay.damus.io'])

  let p2 = await queryProfile('jb55@jb55.com')
  expect(p2!.pubkey).toEqual('32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245')
  expect(p2!.relays).toEqual(['wss://relay.damus.io'])

  let p3 = await queryProfile('_@fiatjaf.com')
  expect(p3!.pubkey).toEqual('3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d')
  expect(p3!.relays).toEqual(['wss://pyramid.fiatjaf.com', 'wss://nos.lol'])
})

test('validate NIP05_REGEX', () => {
  expect(NIP05_REGEX.test('_@bob.com.br')).toBeTrue()
  expect(NIP05_REGEX.test('bob@bob.com.br')).toBeTrue()
  expect(NIP05_REGEX.test('b&b@bob.com.br')).toBeFalse()

  expect('b&b@bob.com.br'.match(NIP05_REGEX)).toBeNull()
  expect(Array.from('bob@bob.com.br'.match(NIP05_REGEX) || [])).toEqual(['bob@bob.com.br', 'bob', 'bob.com.br', '.br'])

  expect(isNip05('bob@bob.com.br')).toBeTrue()
  expect(isNip05('b&b@bob.com.br')).toBeFalse()
})
