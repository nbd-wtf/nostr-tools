import { schnorr } from '@noble/curves/secp256k1'
import { bytesToHex } from '@noble/hashes/utils'
import { Nostr, Event, EventTemplate, UnsignedEvent, VerifiedEvent, verifiedSymbol, validateEvent } from './core.ts'
import { sha256 } from '@noble/hashes/sha256'

import { utf8Encoder } from './utils.ts'

class JS implements Nostr {
  generateSecretKey(): Uint8Array {
    return schnorr.utils.randomPrivateKey()
  }
  getPublicKey(secretKey: Uint8Array): string {
    return bytesToHex(schnorr.getPublicKey(secretKey))
  }
  finalizeEvent(t: EventTemplate, secretKey: Uint8Array): VerifiedEvent {
    const event = t as VerifiedEvent
    event.pubkey = bytesToHex(schnorr.getPublicKey(secretKey))
    event.id = getEventHash(event)
    event.sig = bytesToHex(schnorr.sign(getEventHash(event), secretKey))
    event[verifiedSymbol] = true
    return event
  }
  verifyEvent(event: Event): event is VerifiedEvent {
    if (typeof event[verifiedSymbol] === 'boolean') return event[verifiedSymbol]

    const hash = getEventHash(event)
    if (hash !== event.id) {
      event[verifiedSymbol] = false
      return false
    }

    try {
      const valid = schnorr.verify(event.sig, hash, event.pubkey)
      event[verifiedSymbol] = valid
      return valid
    } catch (err) {
      event[verifiedSymbol] = false
      return false
    }
  }
}

export function serializeEvent(evt: UnsignedEvent): string {
  if (!validateEvent(evt)) throw new Error("can't serialize event with wrong or missing properties")
  return JSON.stringify([0, evt.pubkey, evt.created_at, evt.kind, evt.tags, evt.content])
}

export function getEventHash(event: UnsignedEvent): string {
  let eventHash = sha256(utf8Encoder.encode(serializeEvent(event)))
  return bytesToHex(eventHash)
}

const i: JS = new JS()

export const generateSecretKey = i.generateSecretKey
export const getPublicKey = i.getPublicKey
export const finalizeEvent = i.finalizeEvent
export const verifyEvent = i.verifyEvent
export * from './core.ts'
