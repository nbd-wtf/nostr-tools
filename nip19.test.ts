import { test, expect, describe } from 'bun:test'
import { generateSecretKey, getPublicKey } from './pure.ts'
import {
  decode,
  naddrEncode,
  nprofileEncode,
  npubEncode,
  nsecEncode,
  neventEncode,
  type AddressPointer,
  type ProfilePointer,
  EventPointer,
  NostrTypeGuard,
} from './nip19.ts'

test('encode and decode nsec', () => {
  let sk = generateSecretKey()
  let nsec = nsecEncode(sk)
  expect(nsec).toMatch(/nsec1\w+/)
  let { type, data } = decode(nsec)
  expect(type).toEqual('nsec')
  expect(data).toEqual(sk)
})

test('encode and decode npub', () => {
  let pk = getPublicKey(generateSecretKey())
  let npub = npubEncode(pk)
  expect(npub).toMatch(/npub1\w+/)
  let { type, data } = decode(npub)
  expect(type).toEqual('npub')
  expect(data).toEqual(pk)
})

test('encode and decode nprofile', () => {
  let pk = getPublicKey(generateSecretKey())
  let relays = ['wss://relay.nostr.example.mydomain.example.com', 'wss://nostr.banana.com']
  let nprofile = nprofileEncode({ pubkey: pk, relays })
  expect(nprofile).toMatch(/nprofile1\w+/)
  let { type, data } = decode(nprofile)
  expect(type).toEqual('nprofile')
  const pointer = data as ProfilePointer
  expect(pointer.pubkey).toEqual(pk)
  expect(pointer.relays).toContain(relays[0])
  expect(pointer.relays).toContain(relays[1])
})

test('decode nprofile without relays', () => {
  expect(
    decode(
      nprofileEncode({
        pubkey: '97c70a44366a6535c145b333f973ea86dfdc2d7a99da618c40c64705ad98e322',
        relays: [],
      }),
    ).data,
  ).toHaveProperty('pubkey', '97c70a44366a6535c145b333f973ea86dfdc2d7a99da618c40c64705ad98e322')
})

test('encode and decode naddr', () => {
  let pk = getPublicKey(generateSecretKey())
  let relays = ['wss://relay.nostr.example.mydomain.example.com', 'wss://nostr.banana.com']
  let naddr = naddrEncode({
    pubkey: pk,
    relays,
    kind: 30023,
    identifier: 'banana',
  })
  expect(naddr).toMatch(/naddr1\w+/)
  let { type, data } = decode(naddr)
  expect(type).toEqual('naddr')
  const pointer = data as AddressPointer
  expect(pointer.pubkey).toEqual(pk)
  expect(pointer.relays).toContain(relays[0])
  expect(pointer.relays).toContain(relays[1])
  expect(pointer.kind).toEqual(30023)
  expect(pointer.identifier).toEqual('banana')
})

test('encode and decode nevent', () => {
  let pk = getPublicKey(generateSecretKey())
  let relays = ['wss://relay.nostr.example.mydomain.example.com', 'wss://nostr.banana.com']
  let nevent = neventEncode({
    id: pk,
    relays,
    kind: 30023,
  })
  expect(nevent).toMatch(/nevent1\w+/)
  let { type, data } = decode(nevent)
  expect(type).toEqual('nevent')
  const pointer = data as EventPointer
  expect(pointer.id).toEqual(pk)
  expect(pointer.relays).toContain(relays[0])
  expect(pointer.kind).toEqual(30023)
})

test('encode and decode nevent with kind 0', () => {
  let pk = getPublicKey(generateSecretKey())
  let relays = ['wss://relay.nostr.example.mydomain.example.com', 'wss://nostr.banana.com']
  let nevent = neventEncode({
    id: pk,
    relays,
    kind: 0,
  })
  expect(nevent).toMatch(/nevent1\w+/)
  let { type, data } = decode(nevent)
  expect(type).toEqual('nevent')
  const pointer = data as EventPointer
  expect(pointer.id).toEqual(pk)
  expect(pointer.relays).toContain(relays[0])
  expect(pointer.kind).toEqual(0)
})

test('encode and decode naddr with empty "d"', () => {
  let pk = getPublicKey(generateSecretKey())
  let relays = ['wss://relay.nostr.example.mydomain.example.com', 'wss://nostr.banana.com']
  let naddr = naddrEncode({
    identifier: '',
    pubkey: pk,
    relays,
    kind: 3,
  })
  expect(naddr).toMatch(/naddr\w+/)
  let { type, data } = decode(naddr)
  expect(type).toEqual('naddr')
  const pointer = data as AddressPointer
  expect(pointer.identifier).toEqual('')
  expect(pointer.relays).toContain(relays[0])
  expect(pointer.kind).toEqual(3)
  expect(pointer.pubkey).toEqual(pk)
})

test('decode naddr from habla.news', () => {
  let { type, data } = decode(
    'naddr1qq98yetxv4ex2mnrv4esygrl54h466tz4v0re4pyuavvxqptsejl0vxcmnhfl60z3rth2xkpjspsgqqqw4rsf34vl5',
  )
  expect(type).toEqual('naddr')
  const pointer = data as AddressPointer
  expect(pointer.pubkey).toEqual('7fa56f5d6962ab1e3cd424e758c3002b8665f7b0d8dcee9fe9e288d7751ac194')
  expect(pointer.kind).toEqual(30023)
  expect(pointer.identifier).toEqual('references')
})

test('decode naddr from go-nostr with different TLV ordering', () => {
  let { type, data } = decode(
    'naddr1qqrxyctwv9hxzq3q80cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsxpqqqp65wqfwwaehxw309aex2mrp0yhxummnw3ezuetcv9khqmr99ekhjer0d4skjm3wv4uxzmtsd3jjucm0d5q3vamnwvaz7tmwdaehgu3wvfskuctwvyhxxmmd0zfmwx',
  )

  expect(type).toEqual('naddr')
  const pointer = data as AddressPointer
  expect(pointer.pubkey).toEqual('3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d')
  expect(pointer.relays).toContain('wss://relay.nostr.example.mydomain.example.com')
  expect(pointer.relays).toContain('wss://nostr.banana.com')
  expect(pointer.kind).toEqual(30023)
  expect(pointer.identifier).toEqual('banana')
})

describe('NostrTypeGuard', () => {
  test('isNProfile', () => {
    const is = NostrTypeGuard.isNProfile('nprofile1qqsvc6ulagpn7kwrcwdqgp797xl7usumqa6s3kgcelwq6m75x8fe8yc5usxdg')

    expect(is).toBeTrue()
  })

  test('isNProfile invalid nprofile', () => {
    const is = NostrTypeGuard.isNProfile('nprofile1qqsvc6ulagpn7kwrcwdqgp797xl7usumqa6s3kgcelwq6m75x8fe8yc5usxãg')

    expect(is).toBeFalse()
  })

  test('isNProfile with invalid nprofile', () => {
    const is = NostrTypeGuard.isNProfile('nsec1lqw6zqyanj9mz8gwhdam6tqge42vptz4zg93qsfej440xm5h5esqya0juv')

    expect(is).toBeFalse()
  })

  test('isNEvent', () => {
    const is = NostrTypeGuard.isNEvent(
      'nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9',
    )

    expect(is).toBeTrue()
  })

  test('isNEvent with invalid nevent', () => {
    const is = NostrTypeGuard.isNEvent(
      'nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8ãrnc9',
    )

    expect(is).toBeFalse()
  })

  test('isNEvent with invalid nevent', () => {
    const is = NostrTypeGuard.isNEvent('nprofile1qqsvc6ulagpn7kwrcwdqgp797xl7usumqa6s3kgcelwq6m75x8fe8yc5usxdg')

    expect(is).toBeFalse()
  })

  test('isNAddr', () => {
    const is = NostrTypeGuard.isNAddr(
      'naddr1qqxnzdesxqmnxvpexqunzvpcqyt8wumn8ghj7un9d3shjtnwdaehgu3wvfskueqzypve7elhmamff3sr5mgxxms4a0rppkmhmn7504h96pfcdkpplvl2jqcyqqq823cnmhuld',
    )

    expect(is).toBeTrue()
  })

  test('isNAddr with invalid nadress', () => {
    const is = NostrTypeGuard.isNAddr('nsec1lqw6zqyanj9mz8gwhdam6tqge42vptz4zg93qsfej440xm5h5esqya0juv')

    expect(is).toBeFalse()
  })

  test('isNSec', () => {
    const is = NostrTypeGuard.isNSec('nsec1lqw6zqyanj9mz8gwhdam6tqge42vptz4zg93qsfej440xm5h5esqya0juv')

    expect(is).toBeTrue()
  })

  test('isNSec with invalid nsec', () => {
    const is = NostrTypeGuard.isNSec('nsec1lqw6zqyanj9mz8gwhdam6tqge42vptz4zg93qsfej440xm5h5esqya0juã')

    expect(is).toBeFalse()
  })

  test('isNSec with invalid nsec', () => {
    const is = NostrTypeGuard.isNSec('nprofile1qqsvc6ulagpn7kwrcwdqgp797xl7usumqa6s3kgcelwq6m75x8fe8yc5usxdg')

    expect(is).toBeFalse()
  })

  test('isNPub', () => {
    const is = NostrTypeGuard.isNPub('npub1jz5mdljkmffmqjshpyjgqgrhdkuxd9ztzasv8xeh5q92fv33sjgqy4pats')

    expect(is).toBeTrue()
  })

  test('isNPub with invalid npub', () => {
    const is = NostrTypeGuard.isNPub('npub1jz5mdljkmffmqjshpyjgqgrhdkuxd9ztzãsv8xeh5q92fv33sjgqy4pats')

    expect(is).toBeFalse()
  })

  test('isNPub with invalid npub', () => {
    const is = NostrTypeGuard.isNPub('nsec1lqw6zqyanj9mz8gwhdam6tqge42vptz4zg93qsfej440xm5h5esqya0juv')

    expect(is).toBeFalse()
  })

  test('isNote', () => {
    const is = NostrTypeGuard.isNote('note1gmtnz6q2m55epmlpe3semjdcq987av3jvx4emmjsa8g3s9x7tg4sclreky')

    expect(is).toBeTrue()
  })

  test('isNote with invalid note', () => {
    const is = NostrTypeGuard.isNote('note1gmtnz6q2m55epmlpe3semjdcq987av3jvx4emmjsa8g3s9x7tg4sçlreky')

    expect(is).toBeFalse()
  })

  test('isNote with invalid note', () => {
    const is = NostrTypeGuard.isNote('npub1jz5mdljkmffmqjshpyjgqgrhdkuxd9ztzasv8xeh5q92fv33sjgqy4pats')

    expect(is).toBeFalse()
  })

  test('isNcryptsec', () => {
    const is = NostrTypeGuard.isNcryptsec(
      'ncryptsec1qgg9947rlpvqu76pj5ecreduf9jxhselq2nae2kghhvd5g7dgjtcxfqtd67p9m0w57lspw8gsq6yphnm8623nsl8xn9j4jdzz84zm3frztj3z7s35vpzmqf6ksu8r89qk5z2zxfmu5gv8th8wclt0h4p',
    )

    expect(is).toBeTrue()
  })

  test('isNcryptsec with invalid ncrytpsec', () => {
    const is = NostrTypeGuard.isNcryptsec(
      'ncryptsec1qgg9947rlpvqu76pj5ecreduf9jxhselq2nae2kghhvd5g7dgjtcxfqtd67p9m0w57lspw8gsq6yphnm8623nsã8xn9j4jdzz84zm3frztj3z7s35vpzmqf6ksu8r89qk5z2zxfmu5gv8th8wclt0h4p',
    )

    expect(is).toBeFalse()
  })

  test('isNcryptsec with invalid ncrytpsec', () => {
    const is = NostrTypeGuard.isNcryptsec('note1gmtnz6q2m55epmlpe3semjdcq987av3jvx4emmjsa8g3s9x7tg4sçlreky')

    expect(is).toBeFalse()
  })
})
