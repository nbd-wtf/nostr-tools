import { afterEach, expect, test } from 'bun:test'

import { NostrEvent, finalizeEvent, generateSecretKey, getPublicKey } from './pure.ts'
import { Relay } from './relay.ts'

let relay = new Relay('wss://relay.nostr.bg')

afterEach(() => {
  relay.close()
})

test('connectivity', async () => {
  await relay.connect()
  expect(relay.connected).toBeTrue()
})

test('connectivity, with Relay.connect()', async () => {
  const relay = await Relay.connect('wss://public.relaying.io')
  expect(relay.connected).toBeTrue()
  relay.close()
})

test('querying', async () => {
  await relay.connect()

  let resolve1: () => void
  let resolve2: () => void

  let waiting = Promise.all([
    new Promise<void>(resolve => {
      resolve1 = resolve
    }),
    new Promise<void>(resolve => {
      resolve2 = resolve
    }),
  ])

  relay.subscribe(
    [
      {
        ids: ['3abc6cbb215af0412ab2c9c8895d96a084297890fd0b4018f8427453350ca2e4'],
      },
    ],
    {
      onevent(event) {
        expect(event).toHaveProperty('id', '3abc6cbb215af0412ab2c9c8895d96a084297890fd0b4018f8427453350ca2e4')
        expect(event).toHaveProperty('content', '+')
        expect(event).toHaveProperty('kind', 7)
        resolve1()
      },
      oneose() {
        resolve2()
      },
    },
  )

  let [t1, t2] = await waiting
  expect(t1).toBeUndefined()
  expect(t2).toBeUndefined()
}, 10000)

test('listening and publishing and closing', async () => {
  await relay.connect()

  let sk = generateSecretKey()
  let pk = getPublicKey(sk)
  let resolveEose: (_: void) => void
  let resolveEvent: (_: void) => void
  let resolveClose: (_: void) => void
  let eventReceived: NostrEvent | undefined

  const eosed = new Promise(resolve => {
    resolveEose = resolve
  })
  const evented = new Promise(resolve => {
    resolveEvent = resolve
  })
  const closed = new Promise(resolve => {
    resolveClose = resolve
  })

  let sub = relay.subscribe(
    [
      {
        kinds: [23571],
        authors: [pk],
      },
    ],
    {
      onevent(event) {
        eventReceived = event
        resolveEvent()
      },
      oneose() {
        resolveEose()
      },
      onclose() {
        resolveClose()
      },
    },
  )

  await eosed

  let event = finalizeEvent(
    {
      kind: 23571,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: 'nostr-tools test suite',
    },
    sk,
  )

  await relay.publish(event)
  await evented
  sub.close()
  await closed

  expect(eventReceived).toBeDefined()
  expect(eventReceived).toHaveProperty('pubkey', pk)
  expect(eventReceived).toHaveProperty('kind', 23571)
  expect(eventReceived).toHaveProperty('content', 'nostr-tools test suite')
})
