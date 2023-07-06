import 'websocket-polyfill'

import {finishEvent, type Event} from './event.ts'
import {generatePrivateKey, getPublicKey} from './keys.ts'
import {SimplePool} from './pool.ts'

let pool = new SimplePool()

let relays = [
  'wss://relay.damus.io/',
  'wss://relay.nostr.bg/',
  'wss://nostr.fmt.wiz.biz/',
  'wss://relay.nostr.band/',
  'wss://nos.lol/'
]

afterAll(() => {
  pool.close([
    ...relays,
    'wss://nostr.wine',
    'wss://offchain.pub',
    'wss://eden.nostr.land'
  ])
})

test('removing duplicates when querying', async () => {
  let priv = generatePrivateKey()
  let pub = getPublicKey(priv)

  let sub = pool.sub(relays, [{authors: [pub]}])
  let received: Event[] = []

  sub.on('event', event => {
    // this should be called only once even though we're listening
    // to multiple relays because the events will be catched and
    // deduplicated efficiently (without even being parsed)
    received.push(event)
  })

  let event = finishEvent({
    created_at: Math.round(Date.now() / 1000),
    content: 'test',
    kind: 22345,
    tags: []
  }, priv)

  pool.publish(relays, event)

  await new Promise(resolve => setTimeout(resolve, 1500))

  expect(received).toHaveLength(1)
})

test('same with double querying', async () => {
  let priv = generatePrivateKey()
  let pub = getPublicKey(priv)

  let sub1 = pool.sub(relays, [{authors: [pub]}])
  let sub2 = pool.sub(relays, [{authors: [pub]}])

  let received: Event[] = []

  sub1.on('event', event => {
    received.push(event)
  })

  sub2.on('event', event => {
    received.push(event)
  })

  let event = finishEvent({
    created_at: Math.round(Date.now() / 1000),
    content: 'test2',
    kind: 22346,
    tags: []
  }, priv)

  pool.publish(relays, event)

  await new Promise(resolve => setTimeout(resolve, 1500))

  expect(received).toHaveLength(2)
})

test('get()', async () => {
  let event = await pool.get(relays, {
    ids: ['d7dd5eb3ab747e16f8d0212d53032ea2a7cadef53837e5a6c66d42849fcb9027']
  })

  expect(event).toHaveProperty(
    'id',
    'd7dd5eb3ab747e16f8d0212d53032ea2a7cadef53837e5a6c66d42849fcb9027'
  )
})

test('list()', async () => {
  let events = await pool.list(
    [...relays, 'wss://offchain.pub', 'wss://eden.nostr.land'],
    [
      {
        authors: [
          '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d'
        ],
        kinds: [1],
        limit: 2
      }
    ]
  )

  // the actual received number will be greater than 2, but there will be no duplicates
  expect(events.length).toEqual(
    events
      .map(evt => evt.id)
      // @ts-ignore ???
      .reduce((acc, n) => (acc.indexOf(n) !== -1 ? acc : [...acc, n]), [])
      .length
  )

  let relaysForAllEvents = events
    .map(event => pool.seenOn(event.id))
    .reduce((acc, n) => acc.concat(n), [])
  expect(relaysForAllEvents.length).toBeGreaterThanOrEqual(events.length)
})

test('seenOnEnabled: false', async () => {
  const poolWithoutSeenOn = new SimplePool({seenOnEnabled: false})

  const event = await poolWithoutSeenOn.get(relays, {
    ids: ['d7dd5eb3ab747e16f8d0212d53032ea2a7cadef53837e5a6c66d42849fcb9027']
  })

  expect(event).toHaveProperty(
    'id',
    'd7dd5eb3ab747e16f8d0212d53032ea2a7cadef53837e5a6c66d42849fcb9027'
  )

  const relaysForEvent = poolWithoutSeenOn.seenOn(event!.id)

  expect(relaysForEvent).toHaveLength(0)
})
