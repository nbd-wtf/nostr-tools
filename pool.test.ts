import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test'

import { SimplePool, useWebSocketImplementation } from './pool.ts'
import { finalizeEvent, generateSecretKey, getPublicKey, verifyEvent, type Event } from './pure.ts'
import type { SubscribeManyParams } from './abstract-pool.ts'
import type { Subscription } from './abstract-relay.ts'
import type { Filter } from './filter.ts'
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

test('known ids are bounded per subscription', async () => {
  let priv = generateSecretKey()
  let pub = getPublicKey(priv)
  let received: Event[] = []
  let event = finalizeEvent(
    {
      created_at: Math.round(Date.now() / 1000),
      content: 'test',
      kind: 22347,
      tags: [],
    },
    priv,
  )

  const [relayA, relayB] = relayURLs
  pool.maxKnownIds = 5
  await new Promise<void>(resolve => {
    pool.subscribeMany(
      [relayA, relayB],
      { authors: [pub] },
      {
        onevent(event: Event) {
          received.push(event)
        },
        oneose: resolve, // wait for the stored events of both relays so they don't interfere
      },
    )
  })

  await pool.publish([relayA], event)[0]
  await new Promise(resolve => setTimeout(resolve, 200))
  expect(received).toHaveLength(1)

  const otherEvents = Array.from({ length: 5 }, (_, i) =>
    finalizeEvent({ created_at: i, content: 'other', kind: 22347, tags: [] }, priv),
  )

  for (let i = 0; i < 4; i++) await pool.publish([relayA], otherEvents[i])[0]
  await new Promise(resolve => setTimeout(resolve, 200))
  expect(received).toHaveLength(5)

  // 4 other ids since then, still under the limit, so the same event from another relay is deduplicated
  await pool.publish([relayB], event)[0]
  await new Promise(resolve => setTimeout(resolve, 200))
  expect(received).toHaveLength(5)

  // the 5th other id pushes the original one out, so now the same event is delivered again
  await pool.publish([relayA], otherEvents[4])[0]
  await pool.publish([relayB], event)[0]
  await new Promise(resolve => setTimeout(resolve, 200))
  expect(received).toHaveLength(7)
})

async function openDedupSubscription(filter: Filter, params: SubscribeManyParams) {
  const urls = relayURLs.slice(0, 2)
  for (const relay of mockRelays.slice(0, 2)) {
    relay.secretKeys = []
    relay.preloadedEvents = []
  }
  await new Promise<void>(resolve => {
    pool.subscribeMany(urls, filter, { ...params, id: 'dedup', oneose: resolve })
  })
  return Promise.all(urls.map(url => pool.ensureRelay(url)))
}

test.each([false, true])('forged ids cannot suppress genuine events, with auth retry: %s', async authRequired => {
  mockRelays.slice(0, 2).forEach(relay => (relay.authRequired = authRequired))
  const priv = generateSecretKey()
  const event = finalizeEvent({ created_at: 100, content: 'genuine', kind: 22347, tags: [] }, priv)
  const received: Event[] = []
  let invalid = 0
  let verifications = 0
  pool.verifyEvent = event => {
    verifications++
    return verifyEvent(event)
  }
  const relays = await openDedupSubscription(
    { authors: [event.pubkey] },
    {
      onevent: event => received.push(event),
      oninvalidevent: () => invalid++,
      alreadyHaveEvent: () => false,
      onauth: async template => finalizeEvent(template, priv),
    },
  )
  const send = (relay: (typeof relays)[number], value: Event) =>
    relay._onmessage({ data: JSON.stringify(['EVENT', 'dedup', value]) } as MessageEvent)
  // A hostile relay can copy an ID without being able to sign its event.
  const beforeInvalid = invalid
  send(relays[0], { ...event, sig: '00'.repeat(64) })
  send(relays[1], event)
  expect(invalid).toBe(beforeInvalid + 1)
  expect(received.map(event => event.id)).toEqual([event.id])
  expect(verifications).toBe(2)
  const parse = spyOn(JSON, 'parse')
  try {
    send(relays[0], event)
    expect(received).toHaveLength(1)
    expect(verifications).toBe(2)
    expect(parse).not.toHaveBeenCalled() // accepted duplicates still bypass JSON parsing too
  } finally {
    parse.mockRestore()
  }
})

test('invalid ids do not evict accepted ids', async () => {
  const priv = generateSecretKey()
  const event = finalizeEvent({ created_at: 100, content: 'genuine', kind: 22347, tags: [] }, priv)
  const received: Event[] = []
  pool.maxKnownIds = 2
  const [relay] = await openDedupSubscription({ authors: [event.pubkey] }, { onevent: event => received.push(event) })
  const send = (value: Event) => relay._onmessage({ data: JSON.stringify(['EVENT', 'dedup', value]) } as MessageEvent)
  send(event)
  for (let i = 0; i < 10; i++) send({ ...event, id: i.toString(16).padStart(64, '0') })
  send(event)
  expect(received.map(event => event.id)).toEqual([event.id])
})

test('receivedEvent can update the caller lookup without suppressing the first event', async () => {
  const priv = generateSecretKey()
  const event = finalizeEvent({ created_at: 100, content: 'genuine', kind: 22347, tags: [] }, priv)
  const seen = new Set<string>()
  const calls: string[] = []
  const [relay] = await openDedupSubscription(
    { authors: [event.pubkey] },
    {
      alreadyHaveEvent: id => {
        calls.push('lookup')
        return seen.has(id)
      },
      receivedEvent: (_, id) => {
        calls.push('received')
        seen.add(id)
      },
      onevent: function (this: Subscription) {
        calls.push(this.id)
      },
    },
  )
  relay._onmessage({ data: JSON.stringify(['EVENT', 'dedup', event]) } as MessageEvent)
  expect(calls).toEqual(['lookup', 'received', 'dedup'])
})

test('an open subscription keeps its event callback when params are reused', async () => {
  const priv = generateSecretKey()
  const event = finalizeEvent({ created_at: 100, content: 'genuine', kind: 22347, tags: [] }, priv)
  const calls: string[] = []
  const params: SubscribeManyParams = { id: 'capture', onevent: () => calls.push('original') }
  await new Promise<void>(resolve => {
    params.oneose = resolve
    pool.subscribeMany([relayURLs[0]], { authors: [event.pubkey] }, params)
  })
  params.onevent = () => calls.push('replacement')
  const relay = await pool.ensureRelay(relayURLs[0])
  relay._onmessage({ data: JSON.stringify(['EVENT', 'capture', event]) } as MessageEvent)
  expect(calls).toEqual(['original'])
})

test('deduplication rechecks parsed ids when the fast extractor misses JSON whitespace', async () => {
  const priv = generateSecretKey()
  const event = finalizeEvent({ created_at: 100, content: 'genuine', kind: 22347, tags: [] }, priv)
  const received: Event[] = []
  const [relay] = await openDedupSubscription({ authors: [event.pubkey] }, { onevent: event => received.push(event) })
  const raw = JSON.stringify(['EVENT', 'dedup', event])
  relay._onmessage({ data: raw } as MessageEvent)
  relay._onmessage({ data: raw.replace('"id":', '"id" :') } as MessageEvent)
  expect(received).toHaveLength(1)
})

test('accepted ids and reconnect progress are recorded before user callbacks', async () => {
  const priv = generateSecretKey()
  const event = finalizeEvent({ created_at: 100, content: 'genuine', kind: 22347, tags: [] }, priv)
  let calls = 0
  const relays = await openDedupSubscription(
    { authors: [event.pubkey] },
    {
      onevent: () => {
        calls++
        if (calls === 1) {
          relays[1]._onmessage({ data: JSON.stringify(['EVENT', 'dedup', event]) } as MessageEvent)
          throw new Error('consumer failed')
        }
      },
    },
  )
  const warn = spyOn(console, 'warn').mockImplementation(() => {})
  try {
    relays[0]._onmessage({ data: JSON.stringify(['EVENT', 'dedup', event]) } as MessageEvent)
  } finally {
    warn.mockRestore()
  }
  expect(calls).toBe(1)
  expect(relays[0].openSubs.get('dedup')!.lastEmitted).toBe(100)
})

test('events rejected by one relay filter do not suppress delivery through another', async () => {
  const priv = generateSecretKey()
  const event = finalizeEvent({ created_at: 100, content: 'genuine', kind: 22347, tags: [] }, priv)
  const received: Event[] = []
  await new Promise<void>(resolve =>
    pool.subscribeMap(
      [
        { url: relayURLs[0], filter: { authors: [event.pubkey], kinds: [1] } },
        { url: relayURLs[1], filter: { authors: [event.pubkey], kinds: [22347] } },
      ],
      { id: 'dedup', onevent: event => received.push(event), oneose: resolve },
    ),
  )
  for (const url of relayURLs.slice(0, 2)) {
    const relay = await pool.ensureRelay(url)
    relay._onmessage({ data: JSON.stringify(['EVENT', 'dedup', event]) } as MessageEvent)
  }
  expect(received.map(event => event.id)).toEqual([event.id])
})

test.each(['signature', 'filter'])('reconnect progress ignores events rejected by %s', async rejection => {
  const priv = generateSecretKey()
  const event = finalizeEvent({ created_at: 100, content: 'genuine', kind: 22347, tags: [] }, priv)
  const [relay] = await openDedupSubscription({ authors: [event.pubkey] }, { onevent() {} })
  const invalid =
    rejection === 'signature'
      ? { ...event, id: 'a'.repeat(64), created_at: 2000000000, sig: '00'.repeat(64) }
      : finalizeEvent({ created_at: 2000000000, content: 'wrong author', kind: 22347, tags: [] }, generateSecretKey())
  relay._onmessage({ data: JSON.stringify(['EVENT', 'dedup', event]) } as MessageEvent)
  relay._onmessage({ data: JSON.stringify(['EVENT', 'dedup', invalid]) } as MessageEvent)
  expect(relay.openSubs.get('dedup')!.lastEmitted).toBe(100)
})

test('reconnecting a relay does not advance sibling or caller filters', async () => {
  pool = new SimplePool({ enableReconnect: true })
  const priv = generateSecretKey()
  const newer = finalizeEvent({ created_at: 200, content: 'newer', kind: 22347, tags: [] }, priv)
  const older = finalizeEvent({ created_at: 100, content: 'older', kind: 22347, tags: [] }, priv)
  const filter = { authors: [newer.pubkey], since: 0 }
  const received: string[] = []
  const [relayA, relayB] = await openDedupSubscription(filter, { onevent: event => received.push(event.content) })
  relayA._onmessage({ data: JSON.stringify(['EVENT', 'dedup', newer]) } as MessageEvent)
  relayA.resubscribeBackoff = [1]
  const oldSocket = (relayA as any).ws
  oldSocket.close()
  for (let i = 0; i < 200 && (!relayA.connected || (relayA as any).ws === oldSocket); i++) {
    await new Promise(resolve => setTimeout(resolve, 5))
  }
  expect(relayA.connected).toBeTrue()
  expect((relayA as any).ws).not.toBe(oldSocket)
  expect(relayA.openSubs.get('dedup')!.filters[0].since).toBe(201)
  expect(filter.since).toBe(0)
  expect(relayB.openSubs.get('dedup')!.filters[0].since).toBe(0)
  relayB._onmessage({ data: JSON.stringify(['EVENT', 'dedup', older]) } as MessageEvent)
  expect(received).toEqual(['newer', 'older'])
})

test('auth retry after reconnect preserves the relay-local cursor', async () => {
  pool = new SimplePool({ enableReconnect: true })
  const priv = generateSecretKey()
  const event = finalizeEvent({ created_at: 200, content: 'accepted', kind: 22347, tags: [] }, priv)
  const [relay] = await openDedupSubscription(
    { authors: [event.pubkey], since: 0 },
    {
      onevent() {},
      onauth: async template => finalizeEvent(template, priv),
    },
  )
  relay._onmessage({ data: JSON.stringify(['EVENT', 'dedup', event]) } as MessageEvent)
  const original = relay.openSubs.get('dedup')!
  mockRelays[0].authRequired = true
  relay.resubscribeBackoff = [1]
  ;(relay as any).ws.close()
  for (let i = 0; i < 200; i++) {
    const retry = relay.openSubs.get('dedup')
    if (retry && retry !== original) break
    await new Promise(resolve => setTimeout(resolve, 5))
  }
  const retry = relay.openSubs.get('dedup')!
  expect(retry).toBeDefined()
  expect(retry).not.toBe(original)
  expect(retry.filters[0].since).toBe(201)
})

test.each([0, -1, 1.5, NaN, Infinity, -Infinity])('rejects invalid maxKnownIds in constructor: %s', maxKnownIds => {
  expect(() => new SimplePool({ maxKnownIds })).toThrow(RangeError)
})

test.each([0, -1, 1.5, NaN, Infinity, -Infinity])('rejects invalid maxKnownIds assignment: %s', maxKnownIds => {
  pool.maxKnownIds = 2
  expect(() => {
    pool.maxKnownIds = maxKnownIds
  }).toThrow(RangeError)
  expect(pool.maxKnownIds).toBe(2)
})

test('lowering maxKnownIds shrinks an open subscription on the next new id', async () => {
  const priv = generateSecretKey()
  const events = Array.from({ length: 6 }, (_, i) =>
    finalizeEvent({ created_at: i, content: String(i), kind: 22347, tags: [] }, priv),
  )
  const received: string[] = []
  pool.maxKnownIds = 5
  const relay = await pool.ensureRelay(relayURLs[0])
  await new Promise<void>(resolve => {
    pool.subscribeMany(
      [relayURLs[0]],
      { authors: [getPublicKey(priv)] },
      {
        id: 'resize',
        onevent: event => received.push(event.content),
        oneose: resolve,
      },
    )
  })
  const deliver = (event: Event) =>
    relay._onmessage({ data: JSON.stringify(['EVENT', 'resize', event]) } as MessageEvent)
  events.slice(0, 5).forEach(deliver)
  pool.maxKnownIds = 1
  deliver(events[5])
  deliver(events[5]) // the latest id is still deduplicated
  deliver(events[4]) // every older id must have been evicted
  expect(received).toEqual(['0', '1', '2', '3', '4', '5', '4'])

  // Repeated eviction at capacity one must never exhaust the live iterator.
  for (let i = 0; i < 100; i++) {
    deliver(events[i % 2])
    deliver(events[i % 2])
  }
  expect(received).toHaveLength(107)
})

test('querySync keeps unique results after the known-id cache fills', async () => {
  const priv = generateSecretKey()
  const events = Array.from({ length: 3 }, (_, i) =>
    finalizeEvent({ created_at: i, content: String(i), kind: 22347, tags: [] }, priv),
  )
  for (const relay of mockRelays.slice(0, 2)) {
    relay.secretKeys = []
    relay.preloadedEvents = events
  }
  pool = new SimplePool({ maxKnownIds: 2 })
  const received = await pool.querySync(relayURLs.slice(0, 2), { authors: [getPublicKey(priv)] })
  expect(received.map(event => event.content)).toEqual(['0', '1', '2'])
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
