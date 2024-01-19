import { expect, test } from 'bun:test'

import { finalizeEvent, generateSecretKey, getPublicKey } from './pure.ts'
import { Relay } from './relay.ts'
import { newMockRelay } from './test-helpers.ts'

test('connectivity', async () => {
  const { url } = newMockRelay()
  const relay = new Relay(url)
  await relay.connect()
  expect(relay.connected).toBeTrue()
  relay.close()
})

test('connectivity, with Relay.connect()', async () => {
  const { url } = newMockRelay()
  const relay = await Relay.connect(url)
  expect(relay.connected).toBeTrue()
  relay.close()
})

test('querying', async done => {
  const { url, authors } = newMockRelay()
  const kind = 0

  const relay = new Relay(url)
  await relay.connect()

  relay.subscribe(
    [
      {
        authors: authors,
        kinds: [kind],
      },
    ],
    {
      onevent(event) {
        expect(authors).toContain(event.pubkey)
        expect(event).toHaveProperty('kind', kind)

        relay.close()
        done()
      },
    },
  )
})

test('listening and publishing and closing', async done => {
  const sk = generateSecretKey()
  const pk = getPublicKey(sk)
  const kind = 23571

  const { url } = newMockRelay()
  const relay = new Relay(url)
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
