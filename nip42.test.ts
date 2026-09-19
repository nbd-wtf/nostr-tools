/* global WebSocket */

import { afterAll, expect, test } from 'bun:test'

import { makeAuthEvent } from './nip42.ts'
import { Relay, useWebSocketImplementation } from './relay.ts'
import { SimplePool, useWebSocketImplementation as usePoolWebSocketImplementation } from './pool.ts'
import { finalizeEvent, generateSecretKey, type Event, type EventTemplate, type VerifiedEvent } from './pure.ts'
import { MockRelay, MockWebSocketClient } from './test-helpers.ts'

const originalWebSocket = WebSocket
useWebSocketImplementation(MockWebSocketClient)
usePoolWebSocketImplementation(MockWebSocketClient)
afterAll(() => {
  useWebSocketImplementation(originalWebSocket)
  usePoolWebSocketImplementation(originalWebSocket)
})

test('auth flow', async () => {
  const mockRelay = new MockRelay()
  const relay = await Relay.connect(mockRelay.url)
  const auth = makeAuthEvent(relay.url, 'chachacha')

  expect(auth.tags).toHaveLength(2)
  expect(auth.tags[0]).toEqual(['relay', mockRelay.url])
  expect(auth.tags[1]).toEqual(['challenge', 'chachacha'])
  expect(auth.kind).toEqual(22242)
})

const sk = generateSecretKey()
const sign = async (t: EventTemplate) => finalizeEvent(t, sk)
const refuse = async (): Promise<VerifiedEvent> => {
  throw new Error('not now')
}
const until = async (f: () => boolean) => {
  for (let i = 0; i < 200 && !f(); i++) await new Promise(r => setTimeout(r, 5))
  expect(f()).toBeTrue()
}

test('auth can be retried after the signer refuses', async () => {
  const mockRelay = new MockRelay()
  mockRelay.authRequired = true

  // refuse the challenge that comes with the connection
  const relay = new Relay(mockRelay.url)
  let refused = 0
  relay.onauth = () => {
    refused++
    return refuse()
  }
  await relay.connect()
  await until(() => refused === 1)

  // refuse again, directly
  await expect(relay.auth(refuse)).rejects.toThrow('not now')
  expect(refused).toEqual(1)

  // then sign
  await expect(relay.auth(sign)).resolves.toEqual('')
  relay.close()
})

test('pool: a refused auth closes the subscription, a later one authenticates', async () => {
  const mockRelay = new MockRelay()
  mockRelay.authRequired = true
  const pool = new SimplePool()

  const reasons = await new Promise<{ url: string; reason: string }[]>(resolve => {
    pool.subscribeMany(
      [mockRelay.url],
      { kinds: [1] },
      {
        onevent() {},
        onauth: refuse,
        onclose: resolve,
      },
    )
  })
  expect(reasons).toHaveLength(1)
  expect(reasons[0].reason).toStartWith('auth was required and attempted, but failed with:')

  const events: Event[] = []
  await new Promise<void>(resolve => {
    pool.subscribeMany(
      [mockRelay.url],
      { kinds: [1] },
      {
        onevent: e => {
          events.push(e)
        },
        onauth: sign,
        oneose: resolve,
      },
    )
  })
  expect(events.length).toBeGreaterThan(0)
  pool.close([mockRelay.url])
})
