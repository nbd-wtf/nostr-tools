import { type UnsignedEvent, type Event, getEventHash } from './event.ts'

/** Get POW difficulty from a Nostr hex ID. */
export function getPow(hex: string): number {
  let count = 0

  for (let i = 0; i < hex.length; i++) {
    const nibble = parseInt(hex[i], 16)
    if (nibble === 0) {
      count += 4
    } else {
      count += Math.clz32(nibble) - 28
      break
    }
  }

  return count
}

/**
 * Mine an event with the desired POW. This function mutates the event.
 * Note that this operation is synchronous and should be run in a worker context to avoid blocking the main thread.
 *
 * Adapted from Snort: https://git.v0l.io/Kieran/snort/src/commit/4df6c19248184218c4c03728d61e94dae5f2d90c/packages/system/src/pow-util.ts#L14-L36
 */
export function minePow<K extends number>(unsigned: UnsignedEvent<K>, difficulty: number): Omit<Event<K>, 'sig'> {
  let count = 0

  const event = unsigned as Omit<Event<K>, 'sig'>
  const tag = ['nonce', count.toString(), difficulty.toString()]

  event.tags.push(tag)

  while (true) {
    const now = Math.floor(new Date().getTime() / 1000)

    if (now !== event.created_at) {
      count = 0
      event.created_at = now
    }

    tag[1] = (++count).toString()

    event.id = getEventHash(event)

    if (getPow(event.id) >= difficulty) {
      break
    }
  }

  return event
}

/** Verify POW difficulty for a NOSTR event. */
export function verifyPow(event: Event) {
  let count = 0
  
  // Get event id by hashing event to verify iterations taken
  let hash = getEventHash(event)
  for (let i = 0; i < hash.length; i++) {
    const nibble = parseInt(hash[i], 16)
    if (nibble === 0) {
      count += 4
    } else {
      count += Math.clz32(nibble) - 28
      break
    }
  }

  // Extract the target difficulty level from the tags
  const nonceTag = event.tags.find(tag => tag[0] === 'nonce');
  if (!nonceTag || nonceTag.length < 3) {
    return 0 // Without specifying target difficulty, there is no PROOF of work
  }
  const targetDifficulty = parseInt(nonceTag[2], 10);

  // The proof-of-work is the minimum of actual hash result and target
  return Math.min(count, targetDifficulty)
}