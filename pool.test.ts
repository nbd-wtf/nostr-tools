import { test, expect } from 'bun:test'

import { finishEvent, type Event } from './event.ts'
import { generatePrivateKey, getPublicKey } from './keys.ts'
import { SimplePool } from './pool.ts'

let pool = new SimplePool()

let relays = ['wss://relay.damus.io/', 'wss://relay.nostr.bg/', 'wss://nos.lol', 'wss://public.relaying.io']

test('removing duplicates when querying', async () => {
  let priv = generatePrivateKey()
  let pub = getPublicKey(priv)

  pool.subscribeMany(relays, [{ authors: [pub] }], {
    onevent(event: Event) {
      // this should be called only once even though we're listening
      // to multiple relays because the events will be catched and
      // deduplicated efficiently (without even being parsed)
      received.push(event)
    },
  })
  let received: Event[] = []

  let event = finishEvent(
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

test('same with double querying', async () => {
  let priv = generatePrivateKey()
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

  let event = finishEvent(
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

test('querySync()', async () => {
  let events = await pool.querySync([...relays.slice(2), 'wss://offchain.pub', 'wss://eden.nostr.land'], {
    authors: ['3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d'],
    kinds: [1],
    limit: 2,
  })

  // the actual received number will be greater than 2, but there will be no duplicates
  expect(events.length).toBeGreaterThan(2)
  const uniqueEventCount = new Set(events.map(evt => evt.id)).size
  expect(events).toHaveLength(uniqueEventCount)
})

test('get()', async () => {
  let event = await pool.get(relays, {
    ids: ['9fa1c618fcaad6357e074417b07ed132b083ed30e13113ebb10fcda7137442fe'],
  })

  expect(event).not.toBeNull()
  expect(event).toHaveProperty('id', '9fa1c618fcaad6357e074417b07ed132b083ed30e13113ebb10fcda7137442fe')
})
