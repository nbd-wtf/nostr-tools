import { describe, test, expect } from 'bun:test'
import { Server } from 'mock-socket'
import { NegentropySync, NegentropyStorageVector } from './nip77.ts'
import { Relay } from './relay.ts'
import { NostrEvent } from './core.ts'
import { AbstractRelay } from './abstract-relay.ts'
import { verifyEvent } from './pure.ts'
import { MockWebSocketClient } from './test-helpers.ts'

// const RELAY = 'ws://127.0.0.1:10547'
const RELAY = 'wss://relay.damus.io'

describe('NegentropySync', () => {
  test('syncs events from ' + RELAY, async () => {
    const relay = await Relay.connect(RELAY)

    const storage = new NegentropyStorageVector()
    storage.seal()
    const filter = {
      authors: ['3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d'],
      kinds: [30617, 30618],
    }

    let ids1: string[] = []
    const done1 = Promise.withResolvers<void>()
    const sync1 = new NegentropySync(relay, storage, filter, {
      onneed: (id: string) => {
        ids1.push(id)
      },
      onclose: err => {
        expect(err).toBeUndefined()
        done1.resolve()
      },
    })

    await sync1.start()
    await done1.promise

    expect(ids1.length).toBeGreaterThan(10)

    sync1.close()

    // fetch events
    const events1: NostrEvent[] = []
    const fetched = Promise.withResolvers()
    const sub = relay.subscribe([{ ids: ids1 }], {
      onevent(evt) {
        events1.push(evt)
      },
      oneose() {
        sub.close()
        fetched.resolve()
      },
    })
    await fetched.promise
    expect(events1.map(evt => evt.id).sort()).toEqual(ids1.sort())

    // Second sync with local events
    await relay.connect()

    const storage2 = new NegentropyStorageVector()
    for (const evt of events1) {
      storage2.insert(evt.created_at, evt.id)
    }
    storage2.seal()

    let ids2: string[] = []
    let done2 = Promise.withResolvers()
    const sync2 = new NegentropySync(relay, storage2, filter, {
      onneed: (id: string) => {
        ids2.push(id)
      },
      onclose: err => {
        expect(err).toBeUndefined()
        done2.resolve()
      },
    })

    await sync2.start()
    await done2.promise

    expect(ids2.length).toBe(0)

    sync2.close()

    // third sync with 4 events removed
    const storage3 = new NegentropyStorageVector()

    // shuffle
    ids1.sort(() => Math.random() - 0.5)
    const removedEvents = ids1.slice(0, 1 + Math.floor(Math.random() * ids1.length - 1))
    for (const evt of events1) {
      if (!removedEvents.includes(evt.id)) {
        storage3.insert(evt.created_at, evt.id)
      }
    }
    storage3.seal()

    let ids3: string[] = []
    const done3 = Promise.withResolvers()
    const sync3 = new NegentropySync(relay, storage3, filter, {
      onneed: (id: string) => {
        ids3.push(id)
      },
      onclose: err => {
        expect(err).toBeUndefined()
        done3.resolve()
      },
    })

    await sync3.start()
    await done3.promise

    expect(ids3.sort()).toEqual(removedEvents.sort())

    sync3.close()
  })

  test('NEG-ERR passes the reason to onclose', async () => {
    const url = 'wss://negentropy.mock.relay/neg-err'
    const server = new Server(url, { mock: false })
    server.on('connection', (socket: any) => {
      socket.on('message', (message: string) => {
        const data = JSON.parse(message)
        if (data[0] === 'NEG-OPEN') {
          socket.send(JSON.stringify(['NEG-ERR', data[1], 'blocked: negentropy is disabled']))
        }
      })
    })

    const relay = new AbstractRelay(url, { verifyEvent, websocketImplementation: MockWebSocketClient })
    await relay.connect()

    const storage = new NegentropyStorageVector()
    storage.seal()
    const filter = { kinds: [1] }

    let reason: string | undefined
    const done = Promise.withResolvers<void>()
    const sync = new NegentropySync(relay, storage, filter, {
      onclose: err => {
        reason = err
        done.resolve()
      },
    })

    await sync.start()
    await done.promise

    expect(reason).toBe('blocked: negentropy is disabled')

    relay.close()
    server.stop()
  })
})
