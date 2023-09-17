import { ProfilePointer } from './nip19.ts'

/**
 * NIP-05 regex. The localpart is optional, and should be assumed to be `_` otherwise.
 *
 * - 0: full match
 * - 1: name (optional)
 * - 2: domain
 */
export const NIP05_REGEX = /^(?:([\w.+\-]+|[\p{Lo}\p{Emoji}]+)@)?(([\w\-]+|[\p{Lo}\p{Emoji}]+)+(\.[\w\-.]+)*)$/u

var _fetch: any

try {
  _fetch = fetch
} catch {}

export function useFetchImplementation(fetchImplementation: any) {
  _fetch = fetchImplementation
}

export async function searchDomain(domain: string, query = ''): Promise<{ [name: string]: string }> {
  try {
    let res = await (await _fetch(`https://${domain}/.well-known/nostr.json?name=${query}`)).json()

    return res.names
  } catch (_) {
    return {}
  }
}

export async function queryProfile(fullname: string): Promise<ProfilePointer | null> {
  const match = fullname.match(NIP05_REGEX)
  if (!match) return null

  const [_, name = '_', domain] = match

  try {
    const res = await _fetch(`https://${domain}/.well-known/nostr.json?name=${name}`)
    const { names, relays } = parseNIP05Result(await res.json())

    const pubkey = names[name]
    return pubkey ? { pubkey, relays: relays?.[pubkey] } : null
  } catch (_e) {
    return null
  }
}

/** nostr.json result. */
export interface NIP05Result {
  names: {
    [name: string]: string
  }
  relays?: {
    [pubkey: string]: string[]
  }
}

/** Parse the nostr.json and throw if it's not valid. */
function parseNIP05Result(json: any): NIP05Result {
  const result: NIP05Result = {
    names: {},
  }

  for (const [name, pubkey] of Object.entries(json.names)) {
    if (typeof name === 'string' && typeof pubkey === 'string') {
      result.names[name] = pubkey
    }
  }

  if (json.relays) {
    result.relays = {}
    for (const [pubkey, relays] of Object.entries(json.relays)) {
      if (typeof pubkey === 'string' && Array.isArray(relays)) {
        result.relays[pubkey] = relays.filter((relay: unknown) => typeof relay === 'string')
      }
    }
  }

  return result
}
