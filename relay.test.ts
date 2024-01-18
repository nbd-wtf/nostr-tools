import { afterEach, expect, test } from 'bun:test'

import { NostrEvent, finalizeEvent, generateSecretKey, getPublicKey } from './pure.ts'
import { Relay } from './relay.ts'

let relay = new Relay('wss://nos.lol')

afterEach(() => {
  relay.close()
})

test('connectivity', async () => {
  await relay.connect()
  expect(relay.connected).toBeTrue()
})

test('connectivity, with Relay.connect()', async () => {
  const relay = await Relay.connect('wss://nos.lol')
  expect(relay.connected).toBeTrue()
  relay.close()
})

test('querying', async () => {
  await relay.connect()

  let resolveEvent: () => void
  let resolveEose: () => void

  const evented = new Promise<void>(resolve => {
    resolveEvent = resolve
  })
  const eosed = new Promise<void>(resolve => {
    resolveEose = resolve
  })

  relay.subscribe(
    [
      {
        authors: ['9bbe185a20f50607b6e021c68a2c7275649770d3f8277c120d2b801a2b9a64fc'],
        kinds: [0],
      },
    ],
    {
      onevent(event) {
        expect(event).toHaveProperty('pubkey', '9bbe185a20f50607b6e021c68a2c7275649770d3f8277c120d2b801a2b9a64fc')
        expect(event).toHaveProperty('kind', 0)
        resolveEvent()
      },
      oneose() {
        resolveEose()
      },
    },
  )

  await eosed
  await evented
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
