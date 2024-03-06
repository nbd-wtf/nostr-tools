import { decode } from './nip19.ts'
import { NOSTR_URI_REGEX, type NostrURI } from './nip21.ts'

/** Regex to find NIP-21 URIs inside event content. */
export const regex = (): RegExp => new RegExp(`\\b${NOSTR_URI_REGEX.source}\\b`, 'g')

/** Match result for a Nostr URI in event content. */
export interface NostrURIMatch extends NostrURI {
  /** Index where the URI begins in the event content. */
  start: number
  /** Index where the URI ends in the event content. */
  end: number
}

/** Find and decode all NIP-21 URIs. */
export function* matchAll(content: string): Iterable<NostrURIMatch> {
  const matches = content.matchAll(regex())

  for (const match of matches) {
    try {
      const [uri, value] = match

      yield {
        uri: uri as `nostr:${string}`,
        value,
        decoded: decode(value),
        start: match.index!,
        end: match.index! + uri.length,
      }
    } catch (_e) {
      // do nothing
    }
  }
}

/**
 * Replace all occurrences of Nostr URIs in the text.
 *
 * WARNING: using this on an HTML string is potentially unsafe!
 *
 * @example
 * ```ts
 * nip27.replaceAll(event.content, ({ decoded, value }) => {
 *   switch(decoded.type) {
 *     case 'npub':
 *       return renderMention(decoded)
 *     case 'note':
 *       return renderNote(decoded)
 *     default:
 *       return value
 *   }
 * })
 * ```
 */
export function replaceAll(content: string, replacer: (match: NostrURI) => string): string {
  return content.replaceAll(regex(), (uri, value: string) => {
    return replacer({
      uri: uri as `nostr:${string}`,
      value,
      decoded: decode(value),
    })
  })
}
