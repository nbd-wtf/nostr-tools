import type {Event} from './event.ts'

type EventParams<K extends number> = Partial<Event<K>>

/** Build an event for testing purposes. */
export function buildEvent<K extends number = 1>(params: EventParams<K>): Event<K> {
  return {
    id: '',
    kind: 1 as K,
    pubkey: '',
    created_at: 0,
    content: '',
    tags: [],
    sig: '',
    ...params
  }
}
