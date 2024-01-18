import { expect, test } from 'bun:test'
import { Server } from 'mock-socket'

import { finalizeEvent, generateSecretKey, getPublicKey } from './pure.ts'
import { Relay } from './relay.ts'

test('connectivity', async () => {
  const mockRelayURL = 'wss://mock.relay.url'
  const mockRelay = new Server(mockRelayURL)

  const relay = new Relay(mockRelayURL)
  await relay.connect()

  expect(relay.connected).toBeTrue()

  relay.close()
  mockRelay.stop()
})

test('connectivity, with Relay.connect()', async () => {
  const mockRelayURL = 'wss://mock.relay.url'
  const mockRelay = new Server(mockRelayURL)

  const relay = await Relay.connect(mockRelayURL)

  expect(relay.connected).toBeTrue()

  relay.close()
  mockRelay.stop()
})

test('querying', async done => {
  const sk = generateSecretKey()
  const pk = getPublicKey(sk)
  const kind = 0

  const mockRelayURL = 'wss://mock.relay.url'
  const mockRelay = new Server(mockRelayURL)

  mockRelay.on('connection', socket => {
    socket.on('message', message => {
      const data = JSON.parse(message as string)

      const event = finalizeEvent(
        {
          kind,
          content: '',
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
        },
        sk,
      )

      socket.send(JSON.stringify(['EVENT', data[1], event]))
    })
  })

  const relay = new Relay(mockRelayURL)
  await relay.connect()

  relay.subscribe(
    [
      {
        authors: [pk],
        kinds: [kind],
      },
    ],
    {
      onevent(event) {
        expect(event).toHaveProperty('pubkey', pk)
        expect(event).toHaveProperty('kind', kind)

        relay.close()
        mockRelay.stop()

        done()
      },
    },
  )
})

test('listening and publishing and closing', async done => {
  const sk = generateSecretKey()
  const pk = getPublicKey(sk)
  const kind = 23571

  const mockRelayURL = 'wss://mock.relay.url'
  const mockRelay = new Server(mockRelayURL)

  mockRelay.on('connection', socket => {
    let subId: string | null = null

    socket.on('message', message => {
      const data = JSON.parse(message as string)

      if (data[0] === 'REQ') {
        subId = data[1]
        socket.send(JSON.stringify(['EOSE', data[1]]))
      } else if (data[0] === 'EVENT') {
        socket.send(JSON.stringify(['OK', data[1].id, 'true']))

        socket.send(JSON.stringify(['EVENT', subId, data[1]]))
      }
    })
  })

  const relay = new Relay(mockRelayURL)
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

        sub.close()
      },
      oneose() {},
      onclose() {
        relay.close()
        mockRelay.stop()

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
