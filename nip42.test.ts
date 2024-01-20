import { expect, test } from 'bun:test'

import { makeAuthEvent } from './nip42.ts'
import { Relay } from './relay.ts'
import { MockRelay } from './test-helpers.ts'

test('auth flow', async () => {
  const mockRelay = new MockRelay()
  const relay = await Relay.connect(mockRelay.url)
  const auth = makeAuthEvent(relay.url, 'chachacha')

  expect(auth.tags).toHaveLength(2)
  expect(auth.tags[0]).toEqual(['relay', mockRelay.url])
  expect(auth.tags[1]).toEqual(['challenge', 'chachacha'])
  expect(auth.kind).toEqual(22242)
})
