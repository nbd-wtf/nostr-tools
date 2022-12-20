/* eslint-env jest */

const fetch = require('node-fetch')
const {nip05} = require('./lib/nostr.cjs')

test('fetch nip05 profiles', async () => {
  nip05.useFetchImplementation(fetch)

  let p1 = await nip05.queryProfile('jb55.com')
  expect(p1.pubkey).toEqual(
    '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245'
  )
  expect(p1.relays).toEqual(['wss://relay.damus.io'])

  let p2 = await nip05.queryProfile('jb55@jb55.com')
  expect(p2.pubkey).toEqual(
    '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245'
  )
  expect(p2.relays).toEqual(['wss://relay.damus.io'])
})
