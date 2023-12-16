import { test, expect } from 'bun:test'
import fetch from 'node-fetch'

import { useFetchImplementation, queryProfile } from './nip05.ts'

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
