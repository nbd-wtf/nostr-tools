import { NIP05_REGEX } from './nip05.ts'

var _fetch: any

try {
  _fetch = fetch
} catch {}

export function useFetchImplementation(fetchImplementation: any) {
  _fetch = fetchImplementation
}

export const BUNKER_REGEX = /^bunker:\/\/[0-9a-f]{64}\??[?\/\w:.=&%]*$/

type BunkerPointer = {
  relays: string[]
  pubkey: string
  secret: null | string
}

/** This takes either a bunker:// URL or a name@domain.com NIP-05 identifier
    and returns a BunkerPointer -- or null in case of error */
export async function parseBunkerInput(input: string): Promise<BunkerPointer | null> {
  let match = input.match(BUNKER_REGEX)
  if (match) {
    try {
      const bunkerURL = new URL(input)
      return {
        pubkey: bunkerURL.host,
        relays: bunkerURL.searchParams.getAll('relay'),
        secret: bunkerURL.searchParams.get('secret'),
      }
    } catch (_err) {
      /* just move to the next case */
    }
  }

  match = input.match(NIP05_REGEX)
  if (!match) return null

  const [_, name = '_', domain] = match

  try {
    const url = `https://${domain}/.well-known/nostr.json?name=${name}`
    const res = await (await _fetch(url, { redirect: 'error' })).json()

    let pubkey = res.names[name]
    let relays = res.nip46[pubkey] || []

    return { pubkey, relays, secret: null }
  } catch (_err) {
    return null
  }
}
