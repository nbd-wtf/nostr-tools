/* eslint-env jest */

require('websocket-polyfill')
const {
  relayInit,
  generatePrivateKey,
  getPublicKey,
  getEventHash,
  signEvent
} = require('./lib/nostr.cjs')

let relay = relayInit('wss://nostr-dev.wellorder.net/')

beforeAll(() => {
  relay.connect()
})

afterAll(async () => {
  await relay.close()
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

test('querying', () => {
  var resolve1
  var resolve2

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

test('listening (twice) and publishing', async () => {
  let sk = generatePrivateKey()
  let pk = getPublicKey(sk)
  var resolve1
  var resolve2

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

  let event = {
    kind: 27572,
    pubkey: pk,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: 'nostr-tools test suite'
  }
  event.id = getEventHash(event)
  event.sig = signEvent(event, sk)

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
