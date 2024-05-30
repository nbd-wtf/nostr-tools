export interface Nostr {
  generateSecretKey(): Uint8Array
  getPublicKey(secretKey: Uint8Array): string
  finalizeEvent(event: EventTemplate, secretKey: Uint8Array): VerifiedEvent
  verifyEvent(event: Event): event is VerifiedEvent
}

/** Designates a verified event signature. */
export const verifiedSymbol = Symbol('verified')

export interface Event {
  kind: number
  tags: string[][]
  content: string
  created_at: number
  pubkey: string
  id: string
  sig: string
  [verifiedSymbol]?: boolean
}

export type NostrEvent = Event
export type EventTemplate = Pick<Event, 'kind' | 'tags' | 'content' | 'created_at'>
export type UnsignedEvent = Pick<Event, 'kind' | 'tags' | 'content' | 'created_at' | 'pubkey'>

export type NProfile = `nprofile${string}`
export type NRelay = `nrelay${string}`
export type NEvent = `nevent${string}`
export type NAddress = `naddr${string}`
export type NSecret = `nsec${string}`
export type NPublic = `npub${string}`
export type Note = `note${string}`
export type Nip05 = `${string}@${string}`

export const NostrTypeGuard = {
  isNProfile: (value?: string): value is NProfile => /^nprofile1[a-z\d]+$/.test(value || ''),
  isNRelay: (value?: string): value is NRelay => /^nrelay1[a-z\d]+$/.test(value || ''),
  isNEvent: (value?: string): value is NEvent => /^nevent1[a-z\d]+$/.test(value || ''),
  isNAddress: (value?: string): value is NAddress => /^naddr1[a-z\d]+$/.test(value || ''),
  isNSecret: (value?: string): value is NSecret => /^nsec1[a-z\d]{58}$/.test(value || ''),
  isNPublic: (value?: string): value is NPublic => /^npub1[a-z\d]{58}$/.test(value || ''),
  isNote: (value?: string): value is Note => /^note1[a-z\d]+$/.test(value || ''),
}

/** An event whose signature has been verified. */
export interface VerifiedEvent extends Event {
  [verifiedSymbol]: true
}

const isRecord = (obj: unknown): obj is Record<string, unknown> => obj instanceof Object

export function validateEvent<T>(event: T): event is T & UnsignedEvent {
  if (!isRecord(event)) return false
  if (typeof event.kind !== 'number') return false
  if (typeof event.content !== 'string') return false
  if (typeof event.created_at !== 'number') return false
  if (typeof event.pubkey !== 'string') return false
  if (!event.pubkey.match(/^[a-f0-9]{64}$/)) return false

  if (!Array.isArray(event.tags)) return false
  for (let i = 0; i < event.tags.length; i++) {
    let tag = event.tags[i]
    if (!Array.isArray(tag)) return false
    for (let j = 0; j < tag.length; j++) {
      if (typeof tag[j] === 'object') return false
    }
  }

  return true
}

/**
 * Sort events in reverse-chronological order by the `created_at` timestamp,
 * and then by the event `id` (lexicographically) in case of ties.
 * This mutates the array.
 */
export function sortEvents(events: Event[]): Event[] {
  return events.sort((a: NostrEvent, b: NostrEvent): number => {
    if (a.created_at !== b.created_at) {
      return b.created_at - a.created_at
    }
    return a.id.localeCompare(b.id)
  })
}
