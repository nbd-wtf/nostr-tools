/* eslint-env jest */

require('websocket-polyfill')
const {
  relayInit,
  generatePrivateKey,
  finishEvent,
  nip42
} = require('./lib/nostr.cjs')

test('auth flow', done => {
  const relay = relayInit('wss://nostr.kollider.xyz')
  relay.connect()
  const sk = generatePrivateKey()

  relay.on('auth', async challenge => {
    await expect(
      nip42.authenticate({
        challenge,
        relay,
        sign: e => finishEvent(e, sk)
      })
    ).rejects.toBeTruthy()
    relay.close()
    done()
  })
})
