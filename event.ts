import {Buffer} from 'buffer'
// @ts-ignore
import * as secp256k1 from '@noble/secp256k1'
import {sha256} from '@noble/hashes/sha256'

export type Event = {
  id?: string
  sig?: string
  kind: number
  tags: string[][]
  pubkey: string
  content: string
  created_at: number
}

export function getBlankEvent(): Event {
  return {
    kind: 255,
    pubkey: '',
    content: '',
    tags: [],
    created_at: 0
  }
}

export function serializeEvent(evt: Event): string {
  return JSON.stringify([
    0,
    evt.pubkey,
    evt.created_at,
    evt.kind,
    evt.tags,
    evt.content
  ])
}

export function getEventHash(event: Event): string {
  let eventHash = sha256(Buffer.from(serializeEvent(event)))
  return Buffer.from(eventHash).toString('hex')
}

export function validateEvent(event: Event): boolean {
  if (event.id !== getEventHash(event)) return false
  if (typeof event.content !== 'string') return false
  if (typeof event.created_at !== 'number') return false

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

export function verifySignature(
  event: Event & {id: string; sig: string}
): Promise<boolean> {
  return secp256k1.schnorr.verify(event.sig, event.id, event.pubkey)
}

export async function signEvent(event: Event, key: string): Promise<string> {
  return Buffer.from(
    await secp256k1.schnorr.sign(event.id || getEventHash(event), key)
  ).toString('hex')
}
