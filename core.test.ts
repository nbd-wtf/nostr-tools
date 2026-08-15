import { test, expect } from 'bun:test'
import { compareEvents, sortEvents } from './core.ts'

test('compareEvents', () => {
  const event = {
    id: 'abc123',
    pubkey: 'key1',
    created_at: 1620000000,
    kind: 1,
    tags: [],
    content: 'Hello',
    sig: 'sig1',
  }

  expect(compareEvents(event, { ...event, created_at: 1610000000 })).toBeLessThan(0)
  expect(compareEvents(event, { ...event, id: 'abc124' })).toBeLessThan(0)
  expect(compareEvents(event, { ...event })).toBe(0)
})

test('sortEvents', () => {
  const events = [
    { id: 'abc123', pubkey: 'key1', created_at: 1610000000, kind: 1, tags: [], content: 'Hello', sig: 'sig1' },
    { id: 'abc124', pubkey: 'key2', created_at: 1620000000, kind: 1, tags: [], content: 'World', sig: 'sig2' },
    { id: 'abc125', pubkey: 'key3', created_at: 1620000000, kind: 1, tags: [], content: '!', sig: 'sig3' },
  ]

  const sortedEvents = sortEvents(events)

  expect(sortedEvents).toEqual([
    { id: 'abc124', pubkey: 'key2', created_at: 1620000000, kind: 1, tags: [], content: 'World', sig: 'sig2' },
    { id: 'abc125', pubkey: 'key3', created_at: 1620000000, kind: 1, tags: [], content: '!', sig: 'sig3' },
    { id: 'abc123', pubkey: 'key1', created_at: 1610000000, kind: 1, tags: [], content: 'Hello', sig: 'sig1' },
  ])
})
