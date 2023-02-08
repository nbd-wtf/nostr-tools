/* eslint-env jest */

require('websocket-polyfill')
const {
  pool,
  generatePrivateKey,
  getPublicKey,
  getEventHash,
  signEvent
} = require('./lib/nostr.cjs')

let p = pool()

let relays = [
  p.ensureRelay('wss://nostr-dev.wellorder.net/'),
  p.ensureRelay('wss://relay.nostr.bg/'),
  p.ensureRelay('wss://nostr.fmt.wiz.biz/'),
  p.ensureRelay('wss://relay.nostr.band/'),
  p.ensureRelay('wss://nostr.zebedee.cloud/')
]

beforeAll(async () => {
  Promise.all(
    relays.map(relay => {
      try {
        return relay.connect()
      } catch (err) {
        /***/
      }
    })
  )
})

afterAll(async () => {
  relays.forEach(relay => {
    try {
      relay.close()
    } catch (err) {
      /***/
    }
  })
})

test('removing duplicates when querying', async () => {
  let priv = generatePrivateKey()
  let pub = getPublicKey(priv)

  let subs = relays.map(relay =>
    relay.sub([
      {
        authors: [pub]
      }
    ])
  )

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

  relays.forEach(relay => {
    relay.publish(event)
  })

  await new Promise(resolve => setTimeout(resolve, 1500))

  return expect(received).toHaveLength(1)
})
