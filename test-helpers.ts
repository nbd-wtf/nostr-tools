import type { Event } from './pure.ts'

/** Build an event for testing purposes. */
export function buildEvent(params: Partial<Event>): Event {
  return {
    id: '',
    kind: 1,
    pubkey: '',
    created_at: 0,
    content: '',
    tags: [],
    sig: '',
    ...params,
  }
}
