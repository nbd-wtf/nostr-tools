import { expect, test } from 'bun:test'

import { finalizeEvent, generateSecretKey, getPublicKey } from './pure.ts'
import { Relay } from './relay.ts'
import { MockRelay } from './test-helpers.ts'

test('connectivity', async () => {
  const mockRelay = new MockRelay()

  const relay = new Relay(mockRelay.getUrl())
  await relay.connect()

  expect(relay.connected).toBeTrue()

  relay.close()
  mockRelay.close()
  mockRelay.stop()
})

test('connectivity, with Relay.connect()', async () => {
  const mockRelay = new MockRelay()

  const relay = await Relay.connect(mockRelay.getUrl())

  expect(relay.connected).toBeTrue()

  relay.close()
  mockRelay.close()
  mockRelay.stop()
})

test('querying', async done => {
  const mockRelay = new MockRelay()

  const kind = 0

  const relay = new Relay(mockRelay.getUrl())
  await relay.connect()

  relay.subscribe(
    [
      {
        authors: mockRelay.getAuthors(),
        kinds: [kind],
      },
    ],
    {
      onevent(event) {
        expect(mockRelay.getAuthors()).toContain(event.pubkey)
        expect(event).toHaveProperty('kind', kind)

        relay.close()
        mockRelay.close()
        mockRelay.stop()

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

  const relay = new Relay(mockRelay.getUrl())
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

        mockRelay.close()
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
