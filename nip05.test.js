/* eslint-env jest */

const fetch = require('node-fetch')
const { nip05 } = require('./lib/nostr.cjs')

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

  // @dev : NIP-05 tests querying web3 gateways (.eth.limo) specific to SIWX implementation (NIP-XX)
  let p3 = await nip05.queryProfile('nipxxtest1@sshmatrix.eth.limo')
  expect(p3.pubkey).toEqual(
    'b093e667e573003c04c0b0222328e7035b941f647708626e017b3a375ffcf06e'
  )
  expect(p3.relays).toEqual([])

  let p4 = await nip05.queryProfile('nipxxtest2@sshmatrix.eth.limo')
  expect(p4.pubkey).toEqual(
    '7b9debae4b1767d46797c8289172d592e6e713220dcd2647d712c9a229d5ffe0'
  )
  expect(p4.relays).toEqual([])
})
