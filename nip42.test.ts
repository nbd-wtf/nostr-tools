/* global WebSocket */

import { afterAll, expect, test } from 'bun:test'

import { makeAuthEvent } from './nip42.ts'
import { Relay, useWebSocketImplementation } from './relay.ts'
import { MockRelay, MockWebSocketClient } from './test-helpers.ts'

const originalWebSocket = WebSocket
useWebSocketImplementation(MockWebSocketClient)
afterAll(() => useWebSocketImplementation(originalWebSocket))

test('auth flow', async () => {
  const mockRelay = new MockRelay()
  const relay = await Relay.connect(mockRelay.url)
  const auth = makeAuthEvent(relay.url, 'chachacha')

  expect(auth.tags).toHaveLength(2)
  expect(auth.tags[0]).toEqual(['relay', mockRelay.url])
  expect(auth.tags[1]).toEqual(['challenge', 'chachacha'])
  expect(auth.kind).toEqual(22242)
})
