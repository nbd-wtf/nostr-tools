import type { Event } from './core.ts'
import type { AddressPointer, EventPointer, ProfilePointer } from './nip19.ts'

export type ExternalPointer = {
  value: string
  hint?: string
}

function parseKind(kind: string | undefined): number | string | undefined {
  if (!kind) return undefined
  return /^\d+$/.test(kind) ? parseInt(kind, 10) : kind
}

function parseAddressPointer(value: string, relayUrl?: string): AddressPointer | undefined {
  const idx = value.indexOf(':')
  const idx2 = value.indexOf(':', idx + 1)
  if (idx === -1 || idx2 === -1) return undefined

  const kind = parseInt(value.slice(0, idx), 10)
  if (Number.isNaN(kind)) return undefined

  return {
    kind,
    pubkey: value.slice(idx + 1, idx2),
    identifier: value.slice(idx2 + 1),
    relays: relayUrl ? [relayUrl] : [],
  }
}

function parsePointer(tag: string[]): EventPointer | AddressPointer | ExternalPointer | undefined {
  switch (tag[0]) {
    case 'E':
    case 'e':
      if (!tag[1]) return undefined
      return {
        id: tag[1],
        relays: tag[2] ? [tag[2]] : [],
        author: tag[3],
      }
    case 'A':
    case 'a':
      if (!tag[1]) return undefined
      return parseAddressPointer(tag[1], tag[2])
    case 'I':
    case 'i':
      if (!tag[1]) return undefined
      return {
        value: tag[1],
        hint: tag[2],
      }
  }
}

function parseQuote(tag: string[]): EventPointer | AddressPointer | ExternalPointer | undefined {
  if (!tag[1]) return undefined

  if (tag[1].includes(':')) {
    return parseAddressPointer(tag[1], tag[2])
  }

  return {
    id: tag[1],
    relays: tag[2] ? [tag[2]] : [],
    author: tag[3],
  }
}

function choosePointer(
  candidates: Array<{ tagName: string; pointer: EventPointer | AddressPointer | ExternalPointer }>,
): EventPointer | AddressPointer | ExternalPointer | undefined {
  return (
    candidates.findLast(candidate => candidate.tagName === 'A' || candidate.tagName === 'a')?.pointer ||
    candidates.findLast(candidate => candidate.tagName === 'I' || candidate.tagName === 'i')?.pointer ||
    candidates.findLast(candidate => candidate.tagName === 'E' || candidate.tagName === 'e')?.pointer
  )
}

function inheritRelayHints(
  pointer: EventPointer | AddressPointer | ExternalPointer | undefined,
  profiles: ProfilePointer[],
) {
  if (!pointer || !('id' in pointer) || !pointer.author) return

  const author = profiles.find(profile => profile.pubkey === pointer.author)
  if (!author || !author.relays) return

  if (!pointer.relays) {
    pointer.relays = []
  }

  author.relays.forEach(url => {
    if (pointer.relays!.indexOf(url) === -1) pointer.relays!.push(url)
  })
  author.relays = pointer.relays
}

export function parse(event: Pick<Event, 'tags'>): {
  /**
   * Pointer to root scope.
   */
  root: EventPointer | AddressPointer | ExternalPointer | undefined

  /**
   * Kind of root scope from `K` tag.
   */
  rootKind: number | string | undefined

  /**
   * Pointer to parent item being replied to.
   */
  reply: EventPointer | AddressPointer | ExternalPointer | undefined

  /**
   * Kind of parent item from `k` tag.
   */
  replyKind: number | string | undefined

  /**
   * Reserved for extra referenced items.
   */
  mentions: (EventPointer | AddressPointer | ExternalPointer)[]

  /**
   * Pointers directly quoted with `q` tags.
   */
  quotes: (EventPointer | AddressPointer | ExternalPointer)[]

  /**
   * Root and parent authors.
   */
  profiles: ProfilePointer[]
} {
  const result: ReturnType<typeof parse> = {
    root: undefined,
    rootKind: undefined,
    reply: undefined,
    replyKind: undefined,
    mentions: [],
    quotes: [],
    profiles: [],
  }

  const rootCandidates: Array<{ tagName: string; pointer: EventPointer | AddressPointer | ExternalPointer }> = []
  const replyCandidates: Array<{ tagName: string; pointer: EventPointer | AddressPointer | ExternalPointer }> = []

  for (const tag of event.tags) {
    if ((tag[0] === 'E' || tag[0] === 'A' || tag[0] === 'I') && tag[1]) {
      const pointer = parsePointer(tag)
      if (pointer) rootCandidates.push({ tagName: tag[0], pointer })
      continue
    }

    if ((tag[0] === 'e' || tag[0] === 'a' || tag[0] === 'i') && tag[1]) {
      const pointer = parsePointer(tag)
      if (pointer) replyCandidates.push({ tagName: tag[0], pointer })
      continue
    }

    if (tag[0] === 'K') {
      result.rootKind = parseKind(tag[1])
      continue
    }

    if (tag[0] === 'k') {
      result.replyKind = parseKind(tag[1])
      continue
    }

    if (tag[0] === 'q') {
      const pointer = parseQuote(tag)
      if (pointer) result.quotes.push(pointer)
      continue
    }

    if ((tag[0] === 'P' || tag[0] === 'p') && tag[1]) {
      result.profiles.push({
        pubkey: tag[1],
        relays: tag[2] ? [tag[2]] : [],
      })
    }
  }

  result.root = choosePointer(rootCandidates)
  result.reply = choosePointer(replyCandidates)

  inheritRelayHints(result.root, result.profiles)
  inheritRelayHints(result.reply, result.profiles)
  result.quotes.forEach(pointer => inheritRelayHints(pointer, result.profiles))

  return result
}
