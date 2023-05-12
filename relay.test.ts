import 'websocket-polyfill'

import {finishEvent} from './event.ts'
import {generatePrivateKey, getPublicKey} from './keys.ts'
import {relayInit} from './relay.ts'

let relay = relayInit('wss://relay.damus.io/')

beforeAll(() => {
  relay.connect()
})

afterAll(() => {
  relay.close()
})

test('connectivity', () => {
  return expect(
    new Promise(resolve => {
      relay.on('connect', () => {
        resolve(true)
      })
      relay.on('error', () => {
        resolve(false)
      })
    })
  ).resolves.toBe(true)
})

test('querying', async () => {
  var resolve1: (value: boolean) => void
  var resolve2: (value: boolean) => void

  let sub = relay.sub([
    {
      ids: ['d7dd5eb3ab747e16f8d0212d53032ea2a7cadef53837e5a6c66d42849fcb9027']
    }
  ])
  sub.on('event', event => {
    expect(event).toHaveProperty(
      'id',
      'd7dd5eb3ab747e16f8d0212d53032ea2a7cadef53837e5a6c66d42849fcb9027'
    )
    resolve1(true)
  })
  sub.on('eose', () => {
    resolve2(true)
  })

  let [t1, t2] = await Promise.all([
    new Promise<boolean>(resolve => {
      resolve1 = resolve
    }),
    new Promise<boolean>(resolve => {
      resolve2 = resolve
    })
  ])

  expect(t1).toEqual(true)
  expect(t2).toEqual(true)
})

test('get()', async () => {
  let event = await relay.get({
    ids: ['d7dd5eb3ab747e16f8d0212d53032ea2a7cadef53837e5a6c66d42849fcb9027']
  })

  expect(event).toHaveProperty(
    'id',
    'd7dd5eb3ab747e16f8d0212d53032ea2a7cadef53837e5a6c66d42849fcb9027'
  )
})

test('list()', async () => {
  let events = await relay.list([
    {
      authors: [
        '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d'
      ],
      kinds: [1],
      limit: 2
    }
  ])

  expect(events.length).toEqual(2)
})

test('listening (twice) and publishing', async () => {
  let sk = generatePrivateKey()
  let pk = getPublicKey(sk)
  var resolve1: (value: boolean) => void
  var resolve2: (value: boolean) => void

  let sub = relay.sub([
    {
      kinds: [27572],
      authors: [pk]
    }
  ])

  sub.on('event', event => {
    expect(event).toHaveProperty('pubkey', pk)
    expect(event).toHaveProperty('kind', 27572)
    expect(event).toHaveProperty('content', 'nostr-tools test suite')
    resolve1(true)
  })
  sub.on('event', event => {
    expect(event).toHaveProperty('pubkey', pk)
    expect(event).toHaveProperty('kind', 27572)
    expect(event).toHaveProperty('content', 'nostr-tools test suite')
    resolve2(true)
  })

  let event = finishEvent({
    kind: 27572,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: 'nostr-tools test suite'
  }, sk)

  relay.publish(event)
  return expect(
    Promise.all([
      new Promise(resolve => {
        resolve1 = resolve
      }),
      new Promise(resolve => {
        resolve2 = resolve
      })
    ])
  ).resolves.toEqual([true, true])
})
