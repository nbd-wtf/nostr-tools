import type { Event } from './core.ts'
import type { EventPointer, ProfilePointer } from './nip19.ts'

export function parse(event: Pick<Event, 'tags'>): {
  /**
   * Pointer to the root of the thread.
   */
  root: EventPointer | undefined

  /**
   * Pointer to a "parent" event that parsed event replies to (responded to).
   */
  reply: EventPointer | undefined

  /**
   * Pointers to events that may or may not be in the reply chain.
   */
  mentions: EventPointer[]

  /**
   * Pointers to events that were directly quoted.
   */
  quotes: EventPointer[]

  /**
   * List of pubkeys that are involved in the thread in no particular order.
   */
  profiles: ProfilePointer[]
} {
  const result: ReturnType<typeof parse> = {
    reply: undefined,
    root: undefined,
    mentions: [],
    profiles: [],
    quotes: [],
  }

  let maybeParent: EventPointer | undefined
  let maybeRoot: EventPointer | undefined

  for (let i = event.tags.length - 1; i >= 0; i--) {
    const tag = event.tags[i]

    if (tag[0] === 'e' && tag[1]) {
      const [_, eTagEventId, eTagRelayUrl, eTagMarker, eTagAuthor] = tag as [
        string,
        string,
        undefined | string,
        undefined | string,
        undefined | string,
      ]

      const eventPointer: EventPointer = {
        id: eTagEventId,
        relays: eTagRelayUrl ? [eTagRelayUrl] : [],
        author: eTagAuthor,
      }

      if (eTagMarker === 'root') {
        result.root = eventPointer
        continue
      }

      if (eTagMarker === 'reply') {
        result.reply = eventPointer
        continue
      }

      if (eTagMarker === 'mention') {
        result.mentions.push(eventPointer)
        continue
      }

      if (!maybeParent) {
        maybeParent = eventPointer
      } else {
        maybeRoot = eventPointer
      }

      result.mentions.push(eventPointer)
      continue
    }

    if (tag[0] === 'q' && tag[1]) {
      const [_, eTagEventId, eTagRelayUrl] = tag as [string, string, undefined | string]
      result.quotes.push({
        id: eTagEventId,
        relays: eTagRelayUrl ? [eTagRelayUrl] : [],
      })
    }

    if (tag[0] === 'p' && tag[1]) {
      result.profiles.push({
        pubkey: tag[1],
        relays: tag[2] ? [tag[2]] : [],
      })
      continue
    }
  }

  // get legacy (positional) markers, set reply to root and vice-versa if one of them is missing
  if (!result.root) {
    result.root = maybeRoot || maybeParent || result.reply
  }
  if (!result.reply) {
    result.reply = maybeParent || result.root
  }

  // remove root and reply from mentions, inherit relay hints from authors if any
  ;[result.reply, result.root].forEach(ref => {
    if (!ref) return

    let idx = result.mentions.indexOf(ref)
    if (idx !== -1) {
      result.mentions.splice(idx, 1)
    }
    if (ref.author) {
      let author = result.profiles.find(p => p.pubkey === ref.author)
      if (author && author.relays) {
        if (!ref.relays) {
          ref.relays = []
        }
        author.relays.forEach(url => {
          if (ref.relays!?.indexOf(url) === -1) ref.relays!.push(url)
        })
        author.relays = ref.relays
      }
    }
  })

  result.mentions.forEach(ref => {
    if (ref!.author) {
      let author = result.profiles.find(p => p.pubkey === ref.author)
      if (author && author.relays) {
        if (!ref.relays) {
          ref.relays = []
        }
        author.relays.forEach(url => {
          if (ref.relays!.indexOf(url) === -1) ref.relays!.push(url)
        })
        author.relays = ref.relays
      }
    }
  })

  return result
}
