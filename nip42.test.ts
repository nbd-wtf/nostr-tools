import 'websocket-polyfill'
import {
  relayInit,
  generatePrivateKey,
  finishEvent,
  nip42
} from '.'

test('auth flow', () => {
  const relay = relayInit('wss://nostr.kollider.xyz')
  relay.connect()
  const sk = generatePrivateKey()

  return new Promise<void>((resolve) => {
    relay.on('auth', async challenge => {
      await expect(
        nip42.authenticate({
          challenge,
          relay,
          sign: (e) => finishEvent(e, sk)
        })
      ).rejects.toBeTruthy()
      relay.close()
      resolve()
    })
  })
})
