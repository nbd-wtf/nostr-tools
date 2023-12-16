import { schnorr } from '@noble/curves/secp256k1'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/hashes/utils'

import { getPublicKey } from './keys.ts'
import { utf8Encoder } from './utils.ts'

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

export type EventTemplate = Pick<Event, 'kind' | 'tags' | 'content' | 'created_at'>
export type UnsignedEvent = Pick<Event, 'kind' | 'tags' | 'content' | 'created_at' | 'pubkey'>

/** An event whose signature has been verified. */
export interface VerifiedEvent extends Event {
  [verifiedSymbol]: true
}

export function finishEvent(t: EventTemplate, privateKey: string): VerifiedEvent {
  const event = t as VerifiedEvent
  event.pubkey = getPublicKey(privateKey)
  event.id = getEventHash(event)
  event.sig = getSignature(event, privateKey)
  event[verifiedSymbol] = true
  return event
}

export function serializeEvent(evt: UnsignedEvent): string {
  if (!validateEvent(evt)) throw new Error("can't serialize event with wrong or missing properties")

  return JSON.stringify([0, evt.pubkey, evt.created_at, evt.kind, evt.tags, evt.content])
}

export function getEventHash(event: UnsignedEvent): string {
  let eventHash = sha256(utf8Encoder.encode(serializeEvent(event)))
  return bytesToHex(eventHash)
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

/** Verify the event's signature. This function mutates the event with a `verified` symbol, making it idempotent. */
export function verifySignature(event: Event): event is VerifiedEvent {
  if (typeof event[verifiedSymbol] === 'boolean') return event[verifiedSymbol]

  const hash = getEventHash(event)
  if (hash !== event.id) {
    return (event[verifiedSymbol] = false)
  }

  try {
    return (event[verifiedSymbol] = schnorr.verify(event.sig, hash, event.pubkey))
  } catch (err) {
    return (event[verifiedSymbol] = false)
  }
}

/** @deprecated Use `getSignature` instead. */
export function signEvent(event: UnsignedEvent, key: string): string {
  console.warn(
    'nostr-tools: `signEvent` is deprecated and will be removed or changed in the future. Please use `getSignature` instead.',
  )
  return getSignature(event, key)
}

/** Calculate the signature for an event. */
export function getSignature(event: UnsignedEvent, key: string): string {
  return bytesToHex(schnorr.sign(getEventHash(event), key))
}
