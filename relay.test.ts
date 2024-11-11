import { expect, test } from 'bun:test'
import { Server } from 'mock-socket'
import { finalizeEvent, generateSecretKey, getPublicKey } from './pure.ts'
import { Relay, useWebSocketImplementation } from './relay.ts'
import { MockRelay, MockWebSocketClient } from './test-helpers.ts'

useWebSocketImplementation(MockWebSocketClient)

test('connectivity', async () => {
  const mockRelay = new MockRelay()

  const relay = new Relay(mockRelay.url)
  await relay.connect()

  expect(relay.connected).toBeTrue()

  relay.close()
})

test('connectivity, with Relay.connect()', async () => {
  const mockRelay = new MockRelay()
  const relay = await Relay.connect(mockRelay.url)
  expect(relay.connected).toBeTrue()
  relay.close()
})

test('querying', async done => {
  const mockRelay = new MockRelay()
  const kind = 0
  const relay = new Relay(mockRelay.url)
  await relay.connect()
  relay.subscribe(
    [
      {
        authors: mockRelay.authors,
        kinds: [kind],
      },
    ],
    {
      onevent(event) {
        expect(mockRelay.authors).toContain(event.pubkey)
        expect(event).toHaveProperty('kind', kind)

        relay.close()
        done()
      },
    },
  )
})

test('listening and publishing and closing', async done => {
  const mockRelay = new MockRelay()

  const sk = generateSecretKey()
  const pk = getPublicKey(sk)
  const kind = 23571

  const relay = new Relay(mockRelay.url)
  await relay.connect()

  let sub = relay.subscribe(
    [
      {
        kinds: [kind],
        authors: [pk],
      },
    ],
    {
      onevent(event) {
        expect(event).toHaveProperty('pubkey', pk)
        expect(event).toHaveProperty('kind', kind)
        expect(event).toHaveProperty('content', 'content')

        sub.close() // close the subscription and will trigger onclose()
      },
      onclose() {
        relay.close()
        done()
      },
    },
  )

  relay.publish(
    finalizeEvent(
      {
        kind,
        content: 'content',
        created_at: 0,
        tags: [],
      },
      sk,
    ),
  )
})

test('publish timeout', async () => {
  const url = 'wss://relay.example.com'
  new Server(url)

  const relay = new Relay(url)
  relay.publishTimeout = 100
  await relay.connect()

  setTimeout(() => relay.close(), 20000) // close the relay to fail the test on timeout

  expect(
    relay.publish(
      finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: 'hello',
        },
        generateSecretKey(),
      ),
    ),
  ).rejects.toThrow('publish timed out')
})
