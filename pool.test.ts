import { test, expect, afterAll } from 'bun:test'

import { finalizeEvent, type Event } from './pure.ts'
import { generateSecretKey, getPublicKey } from './pure.ts'
import { SimplePool } from './pool.ts'
import { newMockRelay } from './test-helpers.ts'

let pool = new SimplePool()

let mockRelays = [newMockRelay(), newMockRelay(), newMockRelay(), newMockRelay()]
let relays = mockRelays.map(mr => mr.url)
let authors = mockRelays.flatMap(mr => mr.authors)
let ids = mockRelays.flatMap(mr => mr.ids)

afterAll(() => {
  pool.close(relays)
})

test('removing duplicates when subscribing', async () => {
  let priv = generateSecretKey()
  let pub = getPublicKey(priv)

  pool.subscribeMany(relays, [{ authors: [pub] }], {
    onevent(event: Event) {
      // this should be called only once even though we're listening
      // to multiple relays because the events will be caught and
      // deduplicated efficiently (without even being parsed)
      received.push(event)
    },
  })
  let received: Event[] = []

  let event = finalizeEvent(
    {
      created_at: Math.round(Date.now() / 1000),
      content: 'test',
      kind: 22345,
      tags: [],
    },
    priv,
  )

  await Promise.any(pool.publish(relays, event))
  await new Promise(resolve => setTimeout(resolve, 1500))

  expect(received).toHaveLength(1)
  expect(received[0]).toEqual(event)
})

test('same with double subs', async () => {
  let priv = generateSecretKey()
  let pub = getPublicKey(priv)

  pool.subscribeMany(relays, [{ authors: [pub] }], {
    onevent(event) {
      received.push(event)
    },
  })
  pool.subscribeMany(relays, [{ authors: [pub] }], {
    onevent(event) {
      received.push(event)
    },
  })

  let received: Event[] = []

  let event = finalizeEvent(
    {
      created_at: Math.round(Date.now() / 1000),
      content: 'test2',
      kind: 22346,
      tags: [],
    },
    priv,
  )

  await Promise.any(pool.publish(relays, event))
  await new Promise(resolve => setTimeout(resolve, 1500))

  expect(received).toHaveLength(2)
})

test('query a bunch of events and cancel on eose', async () => {
  let events = new Set<string>()
  await new Promise<void>(resolve => {
    pool.subscribeManyEose(
      [...relays, ...relays, 'wss://relayable.org', 'wss://relay.noswhere.com', 'wss://nothing.com'],
      [{ kinds: [0, 1, 2, 3, 4, 5, 6], limit: 40 }],
      {
        onevent(event) {
          events.add(event.id)
        },
        onclose: resolve as any,
      },
    )
  })
  expect(events.size).toBeGreaterThan(50)
})

test('querySync()', async () => {
  let events = await pool.querySync(
    [...relays.slice(0, 2), ...relays.slice(0, 2), 'wss://offchain.pub', 'wss://eden.nostr.land'],
    {
      authors: authors.slice(0, 2),
      kinds: [1],
      limit: 2,
    },
  )

  // the actual received number will be greater than 2, but there will be no duplicates
  expect(events.length).toBeGreaterThan(2)
  const uniqueEventCount = new Set(events.map(evt => evt.id)).size
  expect(events).toHaveLength(uniqueEventCount)
})

test('get()', async () => {
  let event = await pool.get(relays, {
    ids: [ids[0]],
  })

  expect(event).not.toBeNull()
  expect(event).toHaveProperty('id', ids[0])
})
