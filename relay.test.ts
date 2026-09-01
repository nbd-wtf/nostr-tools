import { expect, test } from 'bun:test'
import { Server } from 'mock-socket'
import { finalizeEvent, generateSecretKey, getPublicKey } from './pure.ts'
import { NostrEvent } from './pure.ts'
import { Relay, useWebSocketImplementation } from './relay.ts'
import { AbstractSimplePool } from './abstract-pool.ts'
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

  // wait for the second ping to fail, which will drop the connection (but schedule a reconnect)
  let sawDisconnect = false
  await new Promise<void>((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error('relay never disconnected')), 2000)
    const interval = setInterval(() => {
      if (!relay.connected) {
        sawDisconnect = true
        clearTimeout(deadline)
        clearInterval(interval)
        resolve()
      }
    }, 10)
  })
  expect(sawDisconnect).toBeTrue()
  expect(relay.connected).toBeFalse()
  // a transient drop that is going to reconnect must NOT fire onclose
  expect(closes).toBe(0)

  // now make it responsive again
  mockRelay.unresponsive = false

  // wait for reconnect
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
  expect(closes).toBe(0) // reconnecting must never fire onclose

  relay.close()
})

test('reconnect survives a failed reconnect attempt and recovers when the relay returns', async () => {
  const mockRelay = new MockRelay()
  const relay = new Relay(mockRelay.url, { enableReconnect: true })
  relay.resubscribeBackoff = [50, 50, 100, 100] // short backoff for testing

  await relay.connect()
  expect(relay.connected).toBeTrue()

  relay.subscribe([{ kinds: [1] }], { onevent: () => {} })
  expect(relay.openSubs.size).toBe(1)

  // Drop server + close live socket so the scheduled reconnect fails.
  ;(mockRelay as any)._server.stop()
  ;(relay as any).ws?.close()

  // Past one failed reconnect attempt: the sub must still be alive
  // (buggy code clears openSubs here via skipReconnection).
  await new Promise(resolve => setTimeout(resolve, 300))
  expect(relay.connected).toBeFalse()
  expect(relay.openSubs.size).toBe(1)

  // Bring the relay back; the next backoff slot must reconnect.
  new MockRelay(mockRelay.url)

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
  expect(relay.openSubs.size).toBe(1)

  relay.close()
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
  const wrongFieldTypeEvent = [
    finalizeEvent(
      {
        kind: 1,
        content: 'content',
        created_at: 0,
        tags: [],
      },
      sk,
    ),
  ].map(v => {
    ;(v as any).kind = '1'
    return v
  })[0]

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

test('a failing-then-succeeding reconnect never orphans or duplicates the relay in the pool map', async () => {
  const url = 'wss://reconnect.leak.test/1'
  let phase: 'up' | 'down' = 'up'

  class FlakyWS extends EventTarget {
    static OPEN = 1
    static CLOSED = 3
    readyState = 0
    onopen: any
    onclose: any
    onerror: any
    onmessage: any
    constructor(public url: string) {
      super()
      setTimeout(() => {
        if (phase === 'up') {
          this.readyState = 1
          this.onopen?.()
        } else {
          this.onerror?.(new Event('error'))
        }
      }, 5)
    }
    send() {}
    close() {
      this.readyState = 3
      this.onclose?.({})
    }
  }

  const pool = new AbstractSimplePool({
    verifyEvent: () => true,
    enableReconnect: true,
    websocketImplementation: FlakyWS as any,
    maxWaitForConnection: 3000,
  })
  const relay = await pool.ensureRelay(url)
  relay.resubscribeBackoff = [30, 30, 30, 30]
  relay.subscribe([{ kinds: [1] }], { onevent: () => {} })
  expect(relay.openSubs.size).toBe(1)

  const map = (pool as any).relays as Map<string, any>
  expect(map.get(url)).toBe(relay)

  // go down and drop the live socket -> schedules a reconnect whose attempt will error via onerror
  phase = 'down'
  ;(relay as any).ws.close()

  // let at least one reconnect attempt FAIL via onerror (the previously-leaky path)
  await new Promise(r => setTimeout(r, 150))
  expect(relay.connected).toBeFalse()
  // INVARIANT: still the SAME tracked relay, no orphan, no duplicate
  expect(map.get(url)).toBe(relay)
  expect(map.size).toBe(1)
  expect(relay.openSubs.size).toBe(1)

  // bring it back; next backoff slot reconnects successfully
  phase = 'up'
  await new Promise<void>((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error('never reconnected')), 1500)
    const interval = setInterval(() => {
      if (relay.connected) {
        clearTimeout(deadline)
        clearInterval(interval)
        resolve()
      }
    }, 10)
  })
  expect(relay.connected).toBeTrue()
  expect(map.get(url)).toBe(relay)
  expect(map.size).toBe(1)
  expect(relay.openSubs.size).toBe(1)

  relay.close()
})
