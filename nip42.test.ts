import { test, expect } from 'bun:test'

import { makeAuthEvent } from './nip42.ts'
import { Relay } from './relay.ts'

test('auth flow', async () => {
  const relay = await Relay.connect('wss://nostr.wine')

  const auth = makeAuthEvent(relay.url, 'chachacha')
  expect(auth.tags).toHaveLength(2)
  expect(auth.tags[0]).toEqual(['relay', 'wss://nostr.wine/'])
  expect(auth.tags[1]).toEqual(['challenge', 'chachacha'])
  expect(auth.kind).toEqual(22242)
})
