/* eslint-env jest */

require('websocket-polyfill')
const {
  SimplePool,
  generatePrivateKey,
  getPublicKey,
  getEventHash,
  signEvent
} = require('./lib/nostr.cjs')

let pool = new SimplePool()

let relays = [
  'wss://nostr-dev.wellorder.net/',
  'wss://relay.nostr.bg/',
  'wss://nostr.fmt.wiz.biz/',
  'wss://relay.nostr.band/',
  'wss://nostr.zebedee.cloud/'
]

beforeAll(async () => {
  Promise.all(
    relays.map(relay => {
      try {
        let r = pool.ensureRelay(relay)
        return r.connect()
      } catch (err) {
        /***/
      }
    })
  )
})

afterAll(async () => {
  relays.forEach(relay => {
    try {
      let r = pool.ensureRelay(relay)
      r.close()
    } catch (err) {
      /***/
    }
  })
})

test('removing duplicates when querying', async () => {
  let priv = generatePrivateKey()
  let pub = getPublicKey(priv)

  let subs = pool.sub(relays, [
    {
      authors: [pub]
    }
  ])

  let received = []

  subs.forEach(sub =>
    sub.on('event', event => {
      // this should be called only once even though we're listening
      // to multiple relays because the events will be catched and
      // deduplicated efficiently (without even being parsed)
      received.push(event)
    })
  )

  let event = {
    pubkey: pub,
    created_at: Math.round(Date.now() / 1000),
    content: 'test',
    kind: 22345,
    tags: []
  }
  event.id = getEventHash(event)
  event.sig = signEvent(event, priv)

  pool.publish(relays, event)

  await new Promise(resolve => setTimeout(resolve, 1500))

  expect(received).toHaveLength(1)
})

test('removing duplicates correctly when double querying', async () => {
  let priv = generatePrivateKey()
  let pub = getPublicKey(priv)

  let subs1 = pool.sub(relays, [{authors: [pub]}])
  let subs2 = pool.sub(relays, [{authors: [pub]}])

  let received = []

  subs1.forEach(sub =>
    sub.on('event', event => {
      received.push(event)
    })
  )
  subs2.forEach(sub =>
    sub.on('event', event => {
      received.push(event)
    })
  )

  let event = {
    pubkey: pub,
    created_at: Math.round(Date.now() / 1000),
    content: 'test2',
    kind: 22346,
    tags: []
  }
  event.id = getEventHash(event)
  event.sig = signEvent(event, priv)

  pool.publish(relays, event)

  await new Promise(resolve => setTimeout(resolve, 1500))

  expect(received).toHaveLength(2)
})
