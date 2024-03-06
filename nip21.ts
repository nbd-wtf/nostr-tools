import { BECH32_REGEX, decode, type DecodeResult } from './nip19.ts'

/** Nostr URI regex, eg `nostr:npub1...` */
export const NOSTR_URI_REGEX: RegExp = new RegExp(`nostr:(${BECH32_REGEX.source})`)

/** Test whether the value is a Nostr URI. */
export function test(value: unknown): value is `nostr:${string}` {
  return typeof value === 'string' && new RegExp(`^${NOSTR_URI_REGEX.source}$`).test(value)
}

/** Parsed Nostr URI data. */
export interface NostrURI {
  /** Full URI including the `nostr:` protocol. */
  uri: `nostr:${string}`
  /** The bech32-encoded data (eg `npub1...`). */
  value: string
  /** Decoded bech32 string, according to NIP-19. */
  decoded: DecodeResult
}

/** Parse and decode a Nostr URI. */
export function parse(uri: string): NostrURI {
  const match = uri.match(new RegExp(`^${NOSTR_URI_REGEX.source}$`))
  if (!match) throw new Error(`Invalid Nostr URI: ${uri}`)
  return {
    uri: match[0] as `nostr:${string}`,
    value: match[1],
    decoded: decode(match[1]),
  }
}
