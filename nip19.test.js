/* eslint-env jest */

const {nip19, generatePrivateKey, getPublicKey} = require('./lib/nostr.cjs')

test('encode and decode nsec', () => {
  let sk = generatePrivateKey()
  let nsec = nip19.nsecEncode(sk)
  expect(nsec).toMatch(/nsec1\w+/)
  let {type, data} = nip19.decode(nsec)
  expect(type).toEqual('nsec')
  expect(data).toEqual(sk)
})

test('encode and decode npub', () => {
  let pk = getPublicKey(generatePrivateKey())
  let npub = nip19.npubEncode(pk)
  expect(npub).toMatch(/npub1\w+/)
  let {type, data} = nip19.decode(npub)
  expect(type).toEqual('npub')
  expect(data).toEqual(pk)
})

test('encode and decode nprofile', () => {
  let pk = getPublicKey(generatePrivateKey())
  let relays = [
    'wss://relay.nostr.example.mydomain.example.com',
    'wss://nostr.banana.com'
  ]
  let nprofile = nip19.nprofileEncode({pubkey: pk, relays})
  expect(nprofile).toMatch(/nprofile1\w+/)
  let {type, data} = nip19.decode(nprofile)
  expect(type).toEqual('nprofile')
  expect(data.pubkey).toEqual(pk)
  expect(data.relays).toContain(relays[0])
  expect(data.relays).toContain(relays[1])
})
