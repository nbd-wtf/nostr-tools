import { afterEach, expect, test } from 'bun:test'

import { finalizeEvent, generateSecretKey, getPublicKey } from './pure.ts'
import { Relay } from './relay.ts'

let relay = new Relay('wss://public.relaying.io')

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
  var resolve1: (_: void) => void
  var resolve2: (_: void) => void

  let waiting = Promise.all([
    new Promise(resolve => {
      resolve1 = resolve
    }),
    new Promise(resolve => {
      resolve2 = resolve
    }),
  ])

  let sub = relay.subscribe(
    [
      {
        kinds: [23571],
        authors: [pk],
      },
    ],
    {
      onevent(event) {
        expect(event).toHaveProperty('pubkey', pk)
        expect(event).toHaveProperty('kind', 23571)
        expect(event).toHaveProperty('content', 'nostr-tools test suite')
        resolve1()
      },
      onclose() {
        resolve2()
      },
    },
  )

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
  sub.close()

  let [t1, t2] = await waiting
  expect(t1).toBeUndefined()
  expect(t2).toBeUndefined()
})
