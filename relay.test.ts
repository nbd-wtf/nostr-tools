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

test('ping-pong timeout', async () => {
  const mockRelay = new MockRelay()
  const relay = new Relay(mockRelay.url, { enablePing: true })
  relay.pingTimeout = 50
  relay.pingFrequency = 50

  let closed = false
  const closedPromise = new Promise<void>(resolve => {
    relay.onclose = () => {
      closed = true
      resolve()
    }
  })

  await relay.connect()
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

test('reconnect on disconnect', async () => {
  const mockRelay = new MockRelay()
  const relay = new Relay(mockRelay.url, { enablePing: true, enableReconnect: true })
  relay.pingTimeout = 50
  relay.pingFrequency = 50
  relay.resubscribeBackoff = [50, 100] // short backoff for testing

  let closes = 0
  relay.onclose = () => {
    closes++
  }

  await relay.connect()
  expect(relay.connected).toBeTrue()

  // wait for the first ping to succeed
  await new Promise(resolve => setTimeout(resolve, 75))
  expect(closes).toBe(0)

  // now make it unresponsive
  mockRelay.unresponsive = true

  // wait for the second ping to fail, which will trigger a close
  await new Promise(resolve => {
    const interval = setInterval(() => {
      if (closes > 0) {
        clearInterval(interval)
        resolve(null)
      }
    }, 10)
  })
  expect(closes).toBe(1)
  expect(relay.connected).toBeFalse()

  // now make it responsive again
  mockRelay.unresponsive = false

  // wait for reconnect
  await new Promise(resolve => {
    const interval = setInterval(() => {
      if (relay.connected) {
        clearInterval(interval)
        resolve(null)
      }
    }, 10)
  })

  expect(relay.connected).toBeTrue()
  expect(closes).toBe(1) // should not have closed again
})

test('reconnect with filter update', async () => {
  const mockRelay = new MockRelay()
  const newSince = Math.floor(Date.now() / 1000)
  const relay = new Relay(mockRelay.url, {
    enablePing: true,
    enableReconnect: filters => {
      return filters.map(f => ({ ...f, since: newSince }))
    },
  })
  relay.pingTimeout = 50
  relay.pingFrequency = 50
  relay.resubscribeBackoff = [50, 100]

  let closes = 0
  relay.onclose = () => {
    closes++
  }

  await relay.connect()
  expect(relay.connected).toBeTrue()

  const sub = relay.subscribe([{ kinds: [1], since: 0 }], {})
  expect(sub.filters[0].since).toBe(0)

  // wait for the first ping to succeed
  await new Promise(resolve => setTimeout(resolve, 75))
  expect(closes).toBe(0)

  // now make it unresponsive
  mockRelay.unresponsive = true

  // wait for the second ping to fail, which will trigger a close
  await new Promise(resolve => {
    const interval = setInterval(() => {
      if (closes > 0) {
        clearInterval(interval)
        resolve(null)
      }
    }, 10)
  })
  expect(closes).toBe(1)
  expect(relay.connected).toBeFalse()

  // now make it responsive again
  mockRelay.unresponsive = false

  // wait for reconnect
  await new Promise(resolve => {
    const interval = setInterval(() => {
      if (relay.connected) {
        clearInterval(interval)
        resolve(null)
      }
    }, 10)
  })

  expect(relay.connected).toBeTrue()
  expect(closes).toBe(1)

  // check if filter was updated
  expect(sub.filters[0].since).toBe(newSince)
})
