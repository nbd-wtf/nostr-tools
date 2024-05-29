import { afterEach, beforeEach, expect, test } from 'bun:test'

import { SimplePool, useWebSocketImplementation } from './pool.ts'
import { finalizeEvent, generateSecretKey, getPublicKey, type Event } from './pure.ts'
import { MockRelay, MockWebSocketClient } from './test-helpers.ts'
import { hexToBytes } from '@noble/hashes/utils'

useWebSocketImplementation(MockWebSocketClient)

let pool: SimplePool
let mockRelays: MockRelay[]
let relayURLs: string[]

beforeEach(() => {
  pool = new SimplePool()
  mockRelays = Array.from({ length: 10 }, () => new MockRelay())
  relayURLs = mockRelays.map(mr => mr.url)
})

afterEach(() => {
  pool.close(relayURLs)
})

test('removing duplicates when subscribing', async () => {
  let priv = generateSecretKey()
  let pub = getPublicKey(priv)
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

  pool.subscribeMany(relayURLs, [{ authors: [pub] }], {
    onevent(event: Event) {
      // this should be called only once even though we're listening
      // to multiple relays because the events will be caught and
      // deduplicated efficiently (without even being parsed)
      received.push(event)
    },
  })

  await Promise.any(pool.publish(relayURLs, event))
  await new Promise(resolve => setTimeout(resolve, 200)) // wait for the new published event to be received

  expect(received).toHaveLength(1)
  expect(received[0]).toEqual(event)
})

test('same with double subs', async () => {
  let priv = generateSecretKey()
  let pub = getPublicKey(priv)

  pool.subscribeMany(relayURLs, [{ authors: [pub] }], {
    onevent(event) {
      received.push(event)
    },
  })
  pool.subscribeMany(relayURLs, [{ authors: [pub] }], {
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

  await Promise.any(pool.publish(relayURLs, event))
  await new Promise(resolve => setTimeout(resolve, 200)) // wait for the new published event to be received

  expect(received).toHaveLength(2)
})

test('subscribe many map', async () => {
  let priv = hexToBytes('8ea002840d413ccdd5be98df5dd89d799eaa566355ede83ca0bbdbb4b145e0d3')
  let pub = getPublicKey(priv)

  let received: Event[] = []
  let event1 = finalizeEvent(
    {
      created_at: Math.round(Date.now() / 1000),
      content: 'test1',
      kind: 20001,
      tags: [],
    },
    priv,
  )
  let event2 = finalizeEvent(
    {
      created_at: Math.round(Date.now() / 1000),
      content: 'test2',
      kind: 20002,
      tags: [['t', 'biloba']],
    },
    priv,
  )
  let event3 = finalizeEvent(
    {
      created_at: Math.round(Date.now() / 1000),
      content: 'test3',
      kind: 20003,
      tags: [['t', 'biloba']],
    },
    priv,
  )

  const [relayA, relayB, relayC] = relayURLs

  pool.subscribeManyMap(
    {
      [relayA]: [{ authors: [pub], kinds: [20001] }],
      [relayB]: [{ authors: [pub], kinds: [20002] }],
      [relayC]: [{ kinds: [20003], '#t': ['biloba'] }],
    },
    {
      onevent(event: Event) {
        received.push(event)
      },
    },
  )

  // publish the first
  await Promise.all(pool.publish([relayA, relayB], event1))
  await new Promise(resolve => setTimeout(resolve, 100))

  expect(received).toHaveLength(1)
  expect(received[0]).toEqual(event1)

  // publish the second
  await pool.publish([relayB], event2)[0]
  await new Promise(resolve => setTimeout(resolve, 100))

  expect(received).toHaveLength(2)
  expect(received[1]).toEqual(event2)

  // publish a events that shouldn't match our filters
  await Promise.all([
    ...pool.publish([relayA, relayB], event3),
    ...pool.publish([relayA, relayB, relayC], event1),
    pool.publish([relayA, relayB, relayC], event2),
  ])
  await new Promise(resolve => setTimeout(resolve, 100))

  expect(received).toHaveLength(2)

  // publsih the third
  await pool.publish([relayC], event3)[0]
  await new Promise(resolve => setTimeout(resolve, 100))

  expect(received).toHaveLength(3)
  expect(received[2]).toEqual(event3)
})

test('query a bunch of events and cancel on eose', async () => {
  let events = new Set<string>()

  await new Promise<void>(resolve => {
    pool.subscribeManyEose(relayURLs, [{ kinds: [0, 1, 2, 3, 4, 5, 6], limit: 40 }], {
      onevent(event) {
        events.add(event.id)
      },
      onclose: resolve as any,
    })
  })

  expect(events.size).toBeGreaterThan(50)
})

test('querySync()', async () => {
  let authors = mockRelays.flatMap(mr => mr.authors)

  let events = await pool.querySync(relayURLs, {
    authors: authors,
    kinds: [1],
    limit: 2,
  })

  const uniqueEventCount = new Set(events.map(evt => evt.id)).size

  // the actual received number will be greater than 2, but there will be no duplicates
  expect(events.length).toBeGreaterThan(2)
  expect(events).toHaveLength(uniqueEventCount)
})

test('get()', async () => {
  let ids = mockRelays.flatMap(mr => mr.ids)

  let event = await pool.get(relayURLs, {
    ids: [ids[0]],
  })

  expect(event).not.toBeNull()
  expect(event).toHaveProperty('id', ids[0])
})
