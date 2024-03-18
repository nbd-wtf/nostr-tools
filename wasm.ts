import { bytesToHex } from '@noble/hashes/utils'
import { Nostr as NostrWasm } from 'nostr-wasm'
import { EventTemplate, Event, Nostr, VerifiedEvent, verifiedSymbol } from './core.ts'

let nw: NostrWasm

export function setNostrWasm(x: NostrWasm) {
  nw = x
}

class Wasm implements Nostr {
  generateSecretKey(): Uint8Array {
    return nw.generateSecretKey()
  }
  getPublicKey(secretKey: Uint8Array): string {
    return bytesToHex(nw.getPublicKey(secretKey))
  }
  finalizeEvent(t: EventTemplate, secretKey: Uint8Array): VerifiedEvent {
    nw.finalizeEvent(t as any, secretKey)
    return t as VerifiedEvent
  }
  verifyEvent(event: Event): event is VerifiedEvent {
    try {
      nw.verifyEvent(event)
      event[verifiedSymbol] = true
      return true
    } catch (err) {
      return false
    }
  }
}

const i: Wasm = new Wasm()
export const generateSecretKey = i.generateSecretKey
export const getPublicKey = i.getPublicKey
export const finalizeEvent = i.finalizeEvent
export const verifyEvent = i.verifyEvent
export * from './core.ts'
