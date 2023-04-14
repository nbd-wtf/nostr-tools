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

test('decode nprofile without relays', () => {
  expect(
    nip19.decode(
      nip19.nprofileEncode({
        pubkey:
          '97c70a44366a6535c145b333f973ea86dfdc2d7a99da618c40c64705ad98e322',
        relays: []
      })
    ).data
  ).toHaveProperty(
    'pubkey',
    '97c70a44366a6535c145b333f973ea86dfdc2d7a99da618c40c64705ad98e322'
  )
})

test('encode and decode naddr', () => {
  let pk = getPublicKey(generatePrivateKey())
  let relays = [
    'wss://relay.nostr.example.mydomain.example.com',
    'wss://nostr.banana.com'
  ]
  let naddr = nip19.naddrEncode({
    pubkey: pk,
    relays,
    kind: 30023,
    identifier: 'banana'
  })
  expect(naddr).toMatch(/naddr1\w+/)
  let {type, data} = nip19.decode(naddr)
  expect(type).toEqual('naddr')
  expect(data.pubkey).toEqual(pk)
  expect(data.relays).toContain(relays[0])
  expect(data.relays).toContain(relays[1])
  expect(data.kind).toEqual(30023)
  expect(data.identifier).toEqual('banana')
})

test('decode naddr from habla.news', () => {
  let {type, data} = nip19.decode(
    'naddr1qq98yetxv4ex2mnrv4esygrl54h466tz4v0re4pyuavvxqptsejl0vxcmnhfl60z3rth2xkpjspsgqqqw4rsf34vl5'
  )
  expect(type).toEqual('naddr')
  expect(data.pubkey).toEqual(
    '7fa56f5d6962ab1e3cd424e758c3002b8665f7b0d8dcee9fe9e288d7751ac194'
  )
  expect(data.kind).toEqual(30023)
  expect(data.identifier).toEqual('references')
})

test('decode naddr from go-nostr with different TLV ordering', () => {
  let {type, data} = nip19.decode(
    'naddr1qqrxyctwv9hxzq3q80cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsxpqqqp65wqfwwaehxw309aex2mrp0yhxummnw3ezuetcv9khqmr99ekhjer0d4skjm3wv4uxzmtsd3jjucm0d5q3vamnwvaz7tmwdaehgu3wvfskuctwvyhxxmmd0zfmwx'
  )

  expect(type).toEqual('naddr')
  expect(data.pubkey).toEqual(
    '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d'
  )
  expect(data.relays).toContain(
    'wss://relay.nostr.example.mydomain.example.com'
  )
  expect(data.relays).toContain('wss://nostr.banana.com')
  expect(data.kind).toEqual(30023)
  expect(data.identifier).toEqual('banana')
})

test('encode and decode nrelay', () => {
  let url = "wss://relay.nostr.example"
  let nrelay = nip19.nrelayEncode(url)
  expect(nrelay).toMatch(/nrelay1\w+/)
  let {type, data} = nip19.decode(nrelay)
  expect(type).toEqual('nrelay')
  expect(data).toEqual(url)
})
