import { expect, test } from 'bun:test'
import { Server } from 'mock-socket'
import { finalizeEvent, generateSecretKey, getPublicKey } from './pure.ts'
import { NostrEvent } from './pure.ts'
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

test('ping-pong timeout (with native ping)', async () => {
  const mockRelay = new MockRelay()
  let pingCalled = false

  // mock a native ping/pong mechanism
  ;(MockWebSocketClient.prototype as any).ping = function (this: any) {
    pingCalled = true
    if (!mockRelay.unresponsive) {
      this.dispatchEvent(new Event('pong'))
    }
  }
  ;(MockWebSocketClient.prototype as any).once = function (
    this: any,
    event: string,
    listener: (...args: any[]) => void,
  ) {
    if (event === 'pong') {
      const onceListener = (...args: any[]) => {
        this.removeEventListener(event, onceListener)
        listener.apply(this, args)
      }
      this.addEventListener('pong', onceListener)
    }
  }

  try {
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
    expect(pingCalled).toBeTrue()
    expect(closed).toBeFalse()

    // now make it unresponsive
    mockRelay.unresponsive = true

    // wait for the second ping to fail
    await closedPromise

    expect(relay.connected).toBeFalse()
    expect(closed).toBeTrue()
  } finally {
    delete (MockWebSocketClient.prototype as any).ping
    delete (MockWebSocketClient.prototype as any).once
  }
})

test('ping-pong timeout (no-ping browser environment)', async () => {
  // spy on send to ensure the fallback dummy REQ is used, since MockWebSocketClient has no ping
  const originalSend = MockWebSocketClient.prototype.send
  let dummyReqSent = false

  try {
    MockWebSocketClient.prototype.send = function (message: string) {
      if (message.includes('REQ') && message.includes('a'.repeat(64))) {
        dummyReqSent = true
      }
      originalSend.call(this, message)
    }

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
    expect(dummyReqSent).toBeTrue()
    expect(closed).toBeFalse()

    // now make it unresponsive
    mockRelay.unresponsive = true

    // wait for the second ping to fail
    await closedPromise

    expect(relay.connected).toBeFalse()
    expect(closed).toBeTrue()
  } finally {
    MockWebSocketClient.prototype.send = originalSend
  }
})

test('ping-pong listeners are cleaned up', async () => {
  const mockRelay = new MockRelay()
  let listenerCount = 0

  // mock a native ping/pong mechanism
  ;(MockWebSocketClient.prototype as any).ping = function (this: any) {
    if (!mockRelay.unresponsive) {
      this.dispatchEvent(new Event('pong'))
    }
  }

  const originalAddEventListener = MockWebSocketClient.prototype.addEventListener
  MockWebSocketClient.prototype.addEventListener = function (event, listener, options) {
    if (event === 'pong') {
      listenerCount++
    }
    // @ts-ignore
    return originalAddEventListener.call(this, event, listener, options)
  }

  const originalRemoveEventListener = MockWebSocketClient.prototype.removeEventListener
  MockWebSocketClient.prototype.removeEventListener = function (event, listener) {
    if (event === 'pong') {
      listenerCount--
    }
    // @ts-ignore
    return originalRemoveEventListener.call(this, event, listener)
  }

  // the check in pingpong() is for .once() so we must mock it
  ;(MockWebSocketClient.prototype as any).once = function (
    this: any,
    event: string,
    listener: (...args: any[]) => void,
  ) {
    const onceListener = (...args: any[]) => {
      this.removeEventListener(event, onceListener)
      listener.apply(this, args)
    }
    this.addEventListener(event, onceListener)
  }

  try {
    const relay = new Relay(mockRelay.url, { enablePing: true })
    relay.pingTimeout = 50
    relay.pingFrequency = 50

    await relay.connect()
    await new Promise(resolve => setTimeout(resolve, 175))

    expect(listenerCount).toBeLessThan(2)

    relay.close()
  } finally {
    delete (MockWebSocketClient.prototype as any).ping
    delete (MockWebSocketClient.prototype as any).once
    MockWebSocketClient.prototype.addEventListener = originalAddEventListener
    MockWebSocketClient.prototype.removeEventListener = originalRemoveEventListener
  }
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

test('oninvalidevent is called for malformed events', async done => {
  const mockRelay = new MockRelay()
  const relay = new Relay(mockRelay.url)
  await relay.connect()

  const sub = relay.prepareSubscription([{ kinds: [1] }], {
    oninvalidevent(event) {
      expect((event as any).kind).toBe('1')
      sub.close()
      relay.close()
      done()
    },
  })

  const sk = generateSecretKey()
  const wrongFieldTypeEvent = [finalizeEvent(
    {
      kind: 1,
      content: 'content',
      created_at: 0,
      tags: [],
    },
    sk
  )].map(v => { (v as any).kind = '1'; return v })[0]

  relay._onmessage({ data: JSON.stringify(['EVENT', sub.id, wrongFieldTypeEvent]) } as MessageEvent)
})

test('oninvalidevent is called for events that do not match subscription filters', async done => {
  const mockRelay = new MockRelay()
  const sk = generateSecretKey()
  const relay = new Relay(mockRelay.url)
  await relay.connect()

  const sub = relay.prepareSubscription([{ kinds: [999] }], {
    oninvalidevent(event) {
      expect((event as NostrEvent).kind).toBe(1)
      sub.close()
      relay.close()
      done()
    },
  })

  const event = finalizeEvent(
    {
      kind: 1,
      content: 'does not match filter',
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
    },
    sk,
  )

  relay._onmessage({ data: JSON.stringify(['EVENT', sub.id, event]) } as MessageEvent)
})
