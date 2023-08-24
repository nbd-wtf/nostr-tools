import 'websocket-polyfill'

import {finishEvent} from './event'
import {generatePrivateKey} from './keys'
import {authenticate} from './nip42'
import {relayInit} from './relay'

test('auth flow', () => {
  const relay = relayInit('wss://nostr.kollider.xyz')
  relay.connect()
  const sk = generatePrivateKey()

  return new Promise<void>(resolve => {
    relay.on('auth', async challenge => {
      await expect(
        authenticate({
          challenge,
          relay,
          sign: e => finishEvent(e, sk)
        })
      ).rejects.toBeTruthy()
      relay.close()
      resolve()
    })
  })
})
