import fetch from 'node-fetch'

import {useFetchImplementation, queryProfile} from './nip05.ts'

test('fetch nip05 profiles', async () => {
  useFetchImplementation(fetch)

  let p1 = await queryProfile('jb55.com')
  expect(p1!.pubkey).toEqual(
    '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245'
  )
  expect(p1!.relays).toEqual(['wss://relay.damus.io'])

  let p2 = await queryProfile('jb55@jb55.com')
  expect(p2!.pubkey).toEqual(
    '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245'
  )
  expect(p2!.relays).toEqual(['wss://relay.damus.io'])

  let p3 = await queryProfile('channel.ninja@channel.ninja')
  expect(p3!.pubkey).toEqual(
    '36e65b503eba8a6b698e724a59137603101166a1cddb45ddc704247fc8aa0fce'
  )
  expect(p3!.relays).toEqual(undefined)

  let p4 = await queryProfile('_@fiatjaf.com')
  expect(p4!.pubkey).toEqual(
    '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d'
  )
  expect(p4!.relays).toEqual([
    'wss://relay.nostr.bg',
    'wss://nos.lol',
    'wss://nostr-verified.wellorder.net',
    'wss://nostr.zebedee.cloud',
    'wss://eden.nostr.land',
    'wss://nostr.milou.lol',
  ])
})
