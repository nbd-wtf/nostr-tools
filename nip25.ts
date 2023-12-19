import { Event, finalizeEvent } from './pure.ts'
import { Reaction } from './kinds.ts'

import type { EventPointer } from './nip19.ts'

export type ReactionEventTemplate = {
  /**
   * Pass only non-nip25 tags if you have to. Nip25 tags ('e' and 'p' tags from reacted event) will be added automatically.
   */
  tags?: string[][]

  /**
   * @default '+'
   */
  content?: string

  created_at: number
}

export function finishReactionEvent(t: ReactionEventTemplate, reacted: Event, privateKey: Uint8Array): Event {
  const inheritedTags = reacted.tags.filter(tag => tag.length >= 2 && (tag[0] === 'e' || tag[0] === 'p'))

  return finalizeEvent(
    {
      ...t,
      kind: Reaction,
      tags: [...(t.tags ?? []), ...inheritedTags, ['e', reacted.id], ['p', reacted.pubkey]],
      content: t.content ?? '+',
    },
    privateKey,
  )
}

export function getReactedEventPointer(event: Event): undefined | EventPointer {
  if (event.kind !== Reaction) {
    return undefined
  }

  let lastETag: undefined | string[]
  let lastPTag: undefined | string[]

  for (let i = event.tags.length - 1; i >= 0 && (lastETag === undefined || lastPTag === undefined); i--) {
    const tag = event.tags[i]
    if (tag.length >= 2) {
      if (tag[0] === 'e' && lastETag === undefined) {
        lastETag = tag
      } else if (tag[0] === 'p' && lastPTag === undefined) {
        lastPTag = tag
      }
    }
  }

  if (lastETag === undefined || lastPTag === undefined) {
    return undefined
  }

  return {
    id: lastETag[1],
    relays: [lastETag[2], lastPTag[2]].filter(x => x !== undefined),
    author: lastPTag[1],
  }
}
