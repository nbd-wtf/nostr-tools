import type { Event } from './core'

/**
 * creates an Event for an AUTH event to be signed.
 */
export function makeAuthEvent(pubkey: string, challenge: string): Event {
  return {
    kind: 22242,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    id: '',
    sig: '',
    tags: [
      ['challenge', challenge],
    ],
    content: '',
  }
}

export {
  generateAuthChallenge,
  generateKeyPair,
  getPublicKeyFromPrivateKey,
  verifySignature,
  signEvent
} from './nip42.crypto'
