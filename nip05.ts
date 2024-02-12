import { ProfilePointer } from './nip19.ts'

/**
 * NIP-05 regex. The localpart is optional, and should be assumed to be `_` otherwise.
 *
 * - 0: full match
 * - 1: name (optional)
 * - 2: domain
 */
export const NIP05_REGEX = /^(?:([\w.+-]+)@)?([\w_-]+(\.[\w_-]+)+)$/

var _fetch: any

try {
  _fetch = fetch
} catch {}

export function useFetchImplementation(fetchImplementation: any) {
  _fetch = fetchImplementation
}

export async function searchDomain(domain: string, query = ''): Promise<{ [name: string]: string }> {
  try {
    const url = `https://${domain}/.well-known/nostr.json?name=${query}`
    const res = await _fetch(url, { redirect: 'error' })
    const json = await res.json()
    return json.names
  } catch (_) {
    return {}
  }
}

export async function queryProfile(fullname: string): Promise<ProfilePointer | null> {
  const match = fullname.match(NIP05_REGEX)
  if (!match) return null

  const [_, name = '_', domain] = match

  try {
    const url = `https://${domain}/.well-known/nostr.json?name=${name}`
    const res = await (await _fetch(url, { redirect: 'error' })).json()

    let pubkey = res.names[name]
    return pubkey ? { pubkey, relays: res.relays?.[pubkey] } : null
  } catch (_e) {
    return null
  }
}

export async function isValid(pubkey: string, nip05: string): Promise<boolean> {
  let res = await queryProfile(nip05)
  return res ? res.pubkey === pubkey : false
}
