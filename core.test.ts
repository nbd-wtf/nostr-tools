import { test, expect } from 'bun:test'
import { NostrTypeGuard, sortEvents } from './core.ts'

test('sortEvents', () => {
  const events = [
    { id: 'abc123', pubkey: 'key1', created_at: 1610000000, kind: 1, tags: [], content: 'Hello', sig: 'sig1' },
    { id: 'abc124', pubkey: 'key2', created_at: 1620000000, kind: 1, tags: [], content: 'World', sig: 'sig2' },
    { id: 'abc125', pubkey: 'key3', created_at: 1620000000, kind: 1, tags: [], content: '!', sig: 'sig3' },
  ]

  const sortedEvents = sortEvents(events)

  expect(sortedEvents).toEqual([
    { id: 'abc124', pubkey: 'key2', created_at: 1620000000, kind: 1, tags: [], content: 'World', sig: 'sig2' },
    { id: 'abc125', pubkey: 'key3', created_at: 1620000000, kind: 1, tags: [], content: '!', sig: 'sig3' },
    { id: 'abc123', pubkey: 'key1', created_at: 1610000000, kind: 1, tags: [], content: 'Hello', sig: 'sig1' },
  ])
})

test('NostrTypeGuard isNProfile', () => {
  const is = NostrTypeGuard.isNProfile('nprofile1qqsvc6ulagpn7kwrcwdqgp797xl7usumqa6s3kgcelwq6m75x8fe8yc5usxdg')

  expect(is).toBeTrue()
})

test('NostrTypeGuard isNProfile invalid nprofile', () => {
  const is = NostrTypeGuard.isNProfile('nprofile1qqsvc6ulagpn7kwrcwdqgp797xl7usumqa6s3kgcelwq6m75x8fe8yc5usxãg')

  expect(is).toBeFalse()
})

test('NostrTypeGuard isNProfile with invalid nprofile', () => {
  const is = NostrTypeGuard.isNProfile('nsec1lqw6zqyanj9mz8gwhdam6tqge42vptz4zg93qsfej440xm5h5esqya0juv')

  expect(is).toBeFalse()
})

test('NostrTypeGuard isNRelay', () => {
  const is = NostrTypeGuard.isNRelay('nrelay1qqt8wumn8ghj7un9d3shjtnwdaehgu3wvfskueq4r295t')

  expect(is).toBeTrue()
})

test('NostrTypeGuard isNRelay with invalid nrelay', () => {
  const is = NostrTypeGuard.isNRelay('nrelay1qqt8wumn8ghj7un9d3shjtnwdaehgu3wvfskueã4r295t')

  expect(is).toBeFalse()
})

test('NostrTypeGuard isNRelay with invalid nrelay', () => {
  const is = NostrTypeGuard.isNRelay(
    'nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9',
  )

  expect(is).toBeFalse()
})

test('NostrTypeGuard isNEvent', () => {
  const is = NostrTypeGuard.isNEvent(
    'nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9',
  )

  expect(is).toBeTrue()
})

test('NostrTypeGuard isNEvent with invalid nevent', () => {
  const is = NostrTypeGuard.isNEvent(
    'nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8ãrnc9',
  )

  expect(is).toBeFalse()
})

test('NostrTypeGuard isNEvent with invalid nevent', () => {
  const is = NostrTypeGuard.isNEvent('nprofile1qqsvc6ulagpn7kwrcwdqgp797xl7usumqa6s3kgcelwq6m75x8fe8yc5usxdg')

  expect(is).toBeFalse()
})

test('NostrTypeGuard isNAddr', () => {
  const is = NostrTypeGuard.isNAddr(
    'naddr1qqxnzdesxqmnxvpexqunzvpcqyt8wumn8ghj7un9d3shjtnwdaehgu3wvfskueqzypve7elhmamff3sr5mgxxms4a0rppkmhmn7504h96pfcdkpplvl2jqcyqqq823cnmhuld',
  )

  expect(is).toBeTrue()
})

test('NostrTypeGuard isNAddr with invalid nadress', () => {
  const is = NostrTypeGuard.isNAddr('nsec1lqw6zqyanj9mz8gwhdam6tqge42vptz4zg93qsfej440xm5h5esqya0juv')

  expect(is).toBeFalse()
})

test('NostrTypeGuard isNSec', () => {
  const is = NostrTypeGuard.isNSec('nsec1lqw6zqyanj9mz8gwhdam6tqge42vptz4zg93qsfej440xm5h5esqya0juv')

  expect(is).toBeTrue()
})

test('NostrTypeGuard isNSec with invalid nsec', () => {
  const is = NostrTypeGuard.isNSec('nsec1lqw6zqyanj9mz8gwhdam6tqge42vptz4zg93qsfej440xm5h5esqya0juã')

  expect(is).toBeFalse()
})

test('NostrTypeGuard isNSec with invalid nsec', () => {
  const is = NostrTypeGuard.isNSec('nprofile1qqsvc6ulagpn7kwrcwdqgp797xl7usumqa6s3kgcelwq6m75x8fe8yc5usxdg')

  expect(is).toBeFalse()
})

test('NostrTypeGuard isNPub', () => {
  const is = NostrTypeGuard.isNPub('npub1jz5mdljkmffmqjshpyjgqgrhdkuxd9ztzasv8xeh5q92fv33sjgqy4pats')

  expect(is).toBeTrue()
})

test('NostrTypeGuard isNPub with invalid npub', () => {
  const is = NostrTypeGuard.isNPub('npub1jz5mdljkmffmqjshpyjgqgrhdkuxd9ztzãsv8xeh5q92fv33sjgqy4pats')

  expect(is).toBeFalse()
})

test('NostrTypeGuard isNPub with invalid npub', () => {
  const is = NostrTypeGuard.isNPub('nsec1lqw6zqyanj9mz8gwhdam6tqge42vptz4zg93qsfej440xm5h5esqya0juv')

  expect(is).toBeFalse()
})

test('NostrTypeGuard isNote', () => {
  const is = NostrTypeGuard.isNote('note1gmtnz6q2m55epmlpe3semjdcq987av3jvx4emmjsa8g3s9x7tg4sclreky')

  expect(is).toBeTrue()
})

test('NostrTypeGuard isNote with invalid note', () => {
  const is = NostrTypeGuard.isNote('note1gmtnz6q2m55epmlpe3semjdcq987av3jvx4emmjsa8g3s9x7tg4sçlreky')

  expect(is).toBeFalse()
})

test('NostrTypeGuard isNote with invalid note', () => {
  const is = NostrTypeGuard.isNote('npub1jz5mdljkmffmqjshpyjgqgrhdkuxd9ztzasv8xeh5q92fv33sjgqy4pats')

  expect(is).toBeFalse()
})

test('NostrTypeGuard isNcryptsec', () => {
  const is = NostrTypeGuard.isNcryptsec(
    'ncryptsec1qgg9947rlpvqu76pj5ecreduf9jxhselq2nae2kghhvd5g7dgjtcxfqtd67p9m0w57lspw8gsq6yphnm8623nsl8xn9j4jdzz84zm3frztj3z7s35vpzmqf6ksu8r89qk5z2zxfmu5gv8th8wclt0h4p',
  )

  expect(is).toBeTrue()
})

test('NostrTypeGuard isNcryptsec with invalid ncrytpsec', () => {
  const is = NostrTypeGuard.isNcryptsec(
    'ncryptsec1qgg9947rlpvqu76pj5ecreduf9jxhselq2nae2kghhvd5g7dgjtcxfqtd67p9m0w57lspw8gsq6yphnm8623nsã8xn9j4jdzz84zm3frztj3z7s35vpzmqf6ksu8r89qk5z2zxfmu5gv8th8wclt0h4p',
  )

  expect(is).toBeFalse()
})

test('NostrTypeGuard isNcryptsec with invalid ncrytpsec', () => {
  const is = NostrTypeGuard.isNcryptsec('note1gmtnz6q2m55epmlpe3semjdcq987av3jvx4emmjsa8g3s9x7tg4sçlreky')

  expect(is).toBeFalse()
})
