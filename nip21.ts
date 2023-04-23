import * as nip19 from './nip19'
import * as nip21 from './nip21'

/**
 * Bech32 regex.
 * @see https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki#bech32
 */
export const BECH32_REGEX =
  /[\x21-\x7E]{1,83}1[023456789acdefghjklmnpqrstuvwxyz]{6,}/

/** Nostr URI regex, eg `nostr:npub1...` */
export const NOSTR_URI_REGEX = new RegExp(`nostr:(${BECH32_REGEX.source})`)

/** Test whether the value is a Nostr URI. */
export function test(value: unknown): value is `nostr:${string}` {
  return (
    typeof value === 'string' &&
    new RegExp(`^${NOSTR_URI_REGEX.source}$`).test(value)
  )
}

/** Parsed Nostr URI data. */
export interface NostrURI {
  /** Full URI including the `nostr:` protocol. */
  uri: `nostr:${string}`
  /** The bech32-encoded data (eg `npub1...`). */
  value: string
  /** Decoded bech32 string, according to NIP-19. */
  decoded: nip19.DecodeResult
}

/** Parse and decode a Nostr URI. */
export function parse(uri: string): NostrURI {
  const match = uri.match(new RegExp(`^${nip21.NOSTR_URI_REGEX.source}$`))
  if (!match) throw new Error(`Invalid Nostr URI: ${uri}`)
  return {
    uri: match[0] as `nostr:${string}`,
    value: match[1],
    decoded: nip19.decode(match[1])
  }
}
