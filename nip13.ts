import { bytesToHex } from '@noble/hashes/utils.js'
import { type UnsignedEvent, type Event } from './pure.ts'
import { sha256 } from '@noble/hashes/sha2.js'

import { utf8Encoder } from './utils.ts'

/** Get POW difficulty from a Nostr hex ID. */
export function getPow(hex: string): number {
  let count = 0

  for (let i = 0; i < 64; i += 8) {
    const nibble = parseInt(hex.substring(i, i + 8), 16)
    if (nibble === 0) {
      count += 32
    } else {
      count += Math.clz32(nibble)
      break
    }
  }

  return count
}

/** Get POW difficulty directly from a Uint8Array hash. */
function getPowFromBytes(hash: Uint8Array): number {
  let count = 0

  for (let i = 0; i < hash.length; i++) {
    const byte = hash[i]
    if (byte === 0) {
      count += 8
    } else {
      count += Math.clz32(byte) - 24
      break
    }
  }

  return count
}

export type MinePowOptions = {
  /**
   * By default the miner refreshes `created_at` to the current second while it works and restarts the
   * nonce whenever the second changes, so a long mining run still yields a fresh timestamp. Set this
   * to `true` to leave `created_at` exactly as given. NIP-59 gift wraps and seals must carry a
   * randomized timestamp (up to two days in the past), and any other caller that has already chosen a
   * `created_at` needs it to survive mining.
   */
  keepCreatedAt?: boolean
}

/**
 * Mine an event with the desired POW. This function mutates the event.
 * Note that this operation is synchronous and should be run in a worker context to avoid blocking the main thread.
 */
export function minePow(unsigned: UnsignedEvent, difficulty: number, options: MinePowOptions = {}): Omit<Event, 'sig'> {
  let count = 0

  const event = unsigned as Omit<Event, 'sig'>
  const tag = ['nonce', count.toString(), difficulty.toString()]

  event.tags.push(tag)

  while (true) {
    if (!options.keepCreatedAt) {
      const now = Math.floor(new Date().getTime() / 1000)

      if (now !== event.created_at) {
        count = 0
        event.created_at = now
      }
    }

    tag[1] = (++count).toString()

    const hash = sha256(
      utf8Encoder.encode(JSON.stringify([0, event.pubkey, event.created_at, event.kind, event.tags, event.content])),
    )

    if (getPowFromBytes(hash) >= difficulty) {
      event.id = bytesToHex(hash)
      break
    }
  }

  return event
}
