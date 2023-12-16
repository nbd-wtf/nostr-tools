import 'websocket-polyfill'

import { makeAuthEvent } from './nip42.ts'
import { relayInit } from './relay.ts'

test('auth flow', () => {
  const relay = relayInit('wss://nostr.wine')

  const auth = makeAuthEvent(relay.url, 'chachacha')
  expect(auth.tags).toHaveLength(2)
  expect(auth.tags[0]).toEqual(['relay', 'wss://nostr.wine'])
  expect(auth.tags[1]).toEqual(['challenge', 'chachacha'])
  expect(auth.kind).toEqual(22242)
})
