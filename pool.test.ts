import { afterEach, beforeEach, expect, test } from 'bun:test'

import { SimplePool, useWebSocketImplementation } from './pool.ts'
import { finalizeEvent, generateSecretKey, getPublicKey, type Event } from './pure.ts'
import { MockRelay, MockWebSocketClient } from './test-helpers.ts'
import { hexToBytes } from '@noble/hashes/utils.js'

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

  pool.subscribeMany(
    relayURLs,
    { authors: [pub] },
    {
      onevent(event: Event) {
        // this should be called only once even though we're listening
        // to multiple relays because the events will be caught and
        // deduplicated efficiently (without even being parsed)
        received.push(event)
      },
    },
  )

  await Promise.any(pool.publish(relayURLs, event))
  await new Promise(resolve => setTimeout(resolve, 200)) // wait for the new published event to be received

  expect(received).toHaveLength(1)
  expect(received[0]).toEqual(event)
})

test('same with double subs', async () => {
  let priv = generateSecretKey()
  let pub = getPublicKey(priv)

  pool.subscribeMany(
    relayURLs,
    { authors: [pub] },
    {
      onevent(event) {
        received.push(event)
      },
    },
  )
  pool.subscribeMany(
    relayURLs,
    { authors: [pub] },
    {
      onevent(event) {
        received.push(event)
      },
    },
  )

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

  pool.subscribeMap(
    [
      { url: relayA, filter: { authors: [pub], kinds: [20001] } },
      { url: relayB, filter: { authors: [pub], kinds: [20002] } },
      { url: relayC, filter: { kinds: [20003], '#t': ['biloba'] } },
    ],
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
    pool.subscribeManyEose(
      relayURLs,
      { kinds: [0, 1, 2, 3, 4, 5, 6], limit: 40 },
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

test('ping-pong timeout in pool', async () => {
  const mockRelay = mockRelays[0]
  pool = new SimplePool({ enablePing: true })
  const relay = await pool.ensureRelay(mockRelay.url)
  relay.pingTimeout = 50
  relay.pingFrequency = 50

  let closed = false
  const closedPromise = new Promise<void>(resolve => {
    relay.onclose = () => {
      closed = true
      resolve()
    }
  })

  expect(relay.connected).toBeTrue()

  // wait for the first ping to succeed
  await new Promise(resolve => setTimeout(resolve, 75))
  expect(closed).toBeFalse()

  // now make it unresponsive
  mockRelay.unresponsive = true

  // wait for the second ping to fail
  await closedPromise

  expect(relay.connected).toBeFalse()
  expect(closed).toBeTrue()
})

test('reconnect on disconnect in pool', async () => {
  const mockRelay = mockRelays[0]
  pool = new SimplePool({ enableReconnect: true })
  const relay = await pool.ensureRelay(mockRelay.url)
  relay.resubscribeBackoff = [50, 100]

  let closes = 0
  relay.onclose = () => {
    closes++
  }

  expect(relay.connected).toBeTrue()

  // drop the live socket, which schedules a reconnect (but must not fire onclose)
  ;(relay as any).ws?.close()

  // wait for the connection to drop
  await new Promise<void>((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error('relay never disconnected')), 2000)
    const interval = setInterval(() => {
      if (!relay.connected) {
        clearTimeout(deadline)
        clearInterval(interval)
        resolve()
      }
    }, 10)
  })
  expect(relay.connected).toBeFalse()
  // a transient drop that is going to reconnect must NOT fire onclose
  expect(closes).toBe(0)

  // wait for reconnect (the mock relay server is still running)
  await new Promise<void>((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error('relay never reconnected')), 2000)
    const interval = setInterval(() => {
      if (relay.connected) {
        clearTimeout(deadline)
        clearInterval(interval)
        resolve()
      }
    }, 10)
  })

  expect(relay.connected).toBeTrue()
  expect(closes).toBe(0)
})

test('reconnect with filter update in pool', async () => {
  const mockRelay = mockRelays[0]
  pool = new SimplePool({
    enableReconnect: true,
  })
  const relay = await pool.ensureRelay(mockRelay.url)
  relay.resubscribeBackoff = [50, 100]

  let closes = 0
  relay.onclose = () => {
    closes++
  }

  expect(relay.connected).toBeTrue()

  const sub = relay.subscribe([{ kinds: [1], since: 0 }], { onevent: () => {} })
  expect(sub.filters[0].since).toBe(0)

  // wait for events to arrive so lastEmitted gets set (used to bump `since` on reconnect)
  await new Promise(resolve => setTimeout(resolve, 50))
  expect(closes).toBe(0)

  // drop the live socket, which schedules a reconnect (but must not fire onclose)
  ;(relay as any).ws?.close()

  // wait for the connection to drop
  await new Promise<void>((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error('relay never disconnected')), 2000)
    const interval = setInterval(() => {
      if (!relay.connected) {
        clearTimeout(deadline)
        clearInterval(interval)
        resolve()
      }
    }, 10)
  })
  expect(relay.connected).toBeFalse()
  // a transient drop that is going to reconnect must NOT fire onclose
  expect(closes).toBe(0)

  // wait for reconnect (the mock relay server is still running)
  await new Promise<void>((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error('relay never reconnected')), 2000)
    const interval = setInterval(() => {
      if (relay.connected) {
        clearTimeout(deadline)
        clearInterval(interval)
        resolve()
      }
    }, 10)
  })

  expect(relay.connected).toBeTrue()
  expect(closes).toBe(0)

  // check if filter was updated
  expect(sub.filters[0].since).toBeGreaterThan(1)
})

test('track relays when publishing', async () => {
  let event1 = finalizeEvent(
    {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: 'hello',
    },
    generateSecretKey(),
  )
  let event2 = finalizeEvent(
    {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: 'hello',
    },
    generateSecretKey(),
  )

  pool.trackRelays = true
  await Promise.all(pool.publish(relayURLs, event1))
  expect(pool.seenOn.get(event1.id)).toBeDefined()
  expect(Array.from(pool.seenOn.get(event1.id)!).map(r => r.url)).toEqual(expect.arrayContaining(relayURLs))

  pool.trackRelays = false
  await Promise.all(pool.publish(relayURLs, event2))
  expect(pool.seenOn.get(event2.id)).toBeUndefined()
})

test('publish() rejects (does not resolve) when a relay is unreachable', async () => {
  // ensureRelay()'s failure was previously swallowed and turned into a
  // *resolved* string ("connection failure: ..."), so callers using the
  // documented `Promise.any(pool.publish(...))` pattern (or any other
  // fulfilled-vs-rejected check) would see success even when every relay
  // was unreachable. It must reject like the pool's other early failure
  // paths (duplicate url, allowConnectingToRelay) already do.
  let event = finalizeEvent(
    {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: 'hello',
    },
    generateSecretKey(),
  )

  const unreachable = 'wss://nobody-is-listening.invalid.mock/nothing'
  const [settled] = await Promise.allSettled(pool.publish([unreachable], event))

  expect(settled.status).toBe('rejected')
  if (settled.status === 'rejected') {
    expect(String(settled.reason)).toContain('connection failure')
  }
})

test('oninvalidevent is called through the pool for invalid events', async done => {
  const mockRelay = mockRelays[0]
  const relay = await pool.ensureRelay(mockRelay.url)

  const sub = relay.prepareSubscription([{ kinds: [1] }], {
    oninvalidevent(event) {
      expect((event as any).kind).toBe('1')
      sub.close()
      done()
    },
  })

  const sk = generateSecretKey()
  const wrongFieldTypeEvent = [
    finalizeEvent({ kind: 1, content: 'hello', created_at: Math.floor(Date.now() / 1000), tags: [] }, sk),
  ].map(v => {
    ;(v as any).kind = '1'
    return v
  })[0]

  relay._onmessage({ data: JSON.stringify(['EVENT', sub.id, wrongFieldTypeEvent]) } as MessageEvent)
})
