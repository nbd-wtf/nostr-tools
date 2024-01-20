import { expect, test } from 'bun:test'

import { makeAuthEvent } from './nip42.ts'
import { Relay } from './relay.ts'
import { newMockRelay } from './test-helpers.ts'

test('auth flow', async () => {
  const { url } = newMockRelay()
  const relay = await Relay.connect(url)
  const auth = makeAuthEvent(relay.url, 'chachacha')

  expect(auth.tags).toHaveLength(2)
  expect(auth.tags[0]).toEqual(['relay', url])
  expect(auth.tags[1]).toEqual(['challenge', 'chachacha'])
  expect(auth.kind).toEqual(22242)
})
