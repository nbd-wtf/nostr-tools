import { verifiedSymbol, type Event, type Nostr, VerifiedEvent } from './core.ts'

export const alwaysTrue: Nostr['verifyEvent'] = (t: Event): t is VerifiedEvent => {
  t[verifiedSymbol] = true
  return true
}
