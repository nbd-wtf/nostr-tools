import { verifiedSymbol, type Event, type Nostr, VerifiedEvent } from './core.ts'
import { verifyEvent } from './pure.ts'

export async function yieldThread() {
  return new Promise<void>((resolve, reject) => {
    try {
      // Check if MessageChannel is available
      if (typeof MessageChannel !== 'undefined') {
        const ch = new MessageChannel()
        const handler = () => {
          // @ts-ignore (typescript thinks this property should be called `removeListener`, but in fact it's `removeEventListener`)
          ch.port1.removeEventListener('message', handler)
          resolve()
        }
        // @ts-ignore (typescript thinks this property should be called `addListener`, but in fact it's `addEventListener`)
        ch.port1.addEventListener('message', handler)
        ch.port2.postMessage(0)
        ch.port1.start()
      } else {
        if (typeof setImmediate !== 'undefined') {
          setImmediate(resolve)
        } else if (typeof setTimeout !== 'undefined') {
          setTimeout(resolve, 0)
        } else {
          // Last resort - resolve immediately
          resolve()
        }
      }
    } catch (e) {
      console.error('during yield: ', e)
      reject(e)
    }
  })
}

export const alwaysTrue: Nostr['verifyEvent'] = (t: Event): t is VerifiedEvent => {
  t[verifiedSymbol] = true
  return true
}

/**
 * Verify an event signature and return a VerifiedEvent or throw on failure.
 * Helpful when you want a simple "verify or die" flow instead of manual checks.
 */
export function assertVerified(event: Event): VerifiedEvent {
  if (verifyEvent(event)) return event as VerifiedEvent
  throw new Error(`Invalid event signature for id ${event.id ?? '<unknown>'}`)
}
