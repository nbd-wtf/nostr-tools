import {schnorr} from '@noble/curves/secp256k1'
import {sha256} from '@noble/hashes/sha256'
import {bytesToHex} from '@noble/hashes/utils'

import {getPublicKey} from './keys.ts'
import {utf8Encoder} from './utils.ts'

/* eslint-disable no-unused-vars */
export enum Kind {
  Metadata = 0,
  Text = 1,
  RecommendRelay = 2,
  Contacts = 3,
  EncryptedDirectMessage = 4,
  EventDeletion = 5,
  Repost = 6,
  Reaction = 7,
  BadgeAward = 8,
  ChannelCreation = 40,
  ChannelMetadata = 41,
  ChannelMessage = 42,
  ChannelHideMessage = 43,
  ChannelMuteUser = 44,
  Blank = 255,
  Report = 1984,
  ZapRequest = 9734,
  Zap = 9735,
  RelayList = 10002,
  ClientAuth = 22242,
  BadgeDefinition = 30008,
  ProfileBadge = 30009,
  Article = 30023
}

export type EventTemplate<K extends number = Kind> = {
  kind: K
  tags: string[][]
  content: string
  created_at: number
}

export type UnsignedEvent<K extends number = Kind> = EventTemplate<K> & {
  pubkey: string
}

export type Event<K extends number = Kind> = UnsignedEvent<K> & {
  id: string
  sig: string
}

export function getBlankEvent(): EventTemplate<Kind.Blank>
export function getBlankEvent<K extends number>(kind: K): EventTemplate<K>
export function getBlankEvent<K>(kind: K | Kind.Blank = Kind.Blank) {
  return {
    kind,
    content: '',
    tags: [],
    created_at: 0
  }
}

export function finishEvent<K extends number = Kind>(
  t: EventTemplate<K>,
  privateKey: string
): Event<K> {
  let event = t as Event<K>
  event.pubkey = getPublicKey(privateKey)
  event.id = getEventHash(event)
  event.sig = getSignature(event, privateKey)
  return event
}

export function serializeEvent(evt: UnsignedEvent<number>): string {
  if (!validateEvent(evt))
    throw new Error("can't serialize event with wrong or missing properties")

  return JSON.stringify([
    0,
    evt.pubkey,
    evt.created_at,
    evt.kind,
    evt.tags,
    evt.content
  ])
}

export function getEventHash(event: UnsignedEvent<number>): string {
  let eventHash = sha256(utf8Encoder.encode(serializeEvent(event)))
  return bytesToHex(eventHash)
}

const isRecord = (obj: unknown): obj is Record<string, unknown> =>
  obj instanceof Object

export function validateEvent<T>(event: T): event is T & UnsignedEvent<number> {
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

export function verifySignature(event: Event<number>): boolean {
  try {
    return schnorr.verify(event.sig, getEventHash(event), event.pubkey)
  } catch (err) {
    return false
  }
}

/** @deprecated Use `getSignature` instead. */
export function signEvent(event: UnsignedEvent<number>, key: string): string {
  console.warn(
    'nostr-tools: `signEvent` is deprecated and will be removed or changed in the future. Please use `getSignature` instead.'
  )
  return getSignature(event, key)
}

/** Calculate the signature for an event. */
export function getSignature(
  event: UnsignedEvent<number>,
  key: string
): string {
  return bytesToHex(schnorr.sign(getEventHash(event), key))
}
