import { ProfilePointer } from './nip19.ts'

export type Nip05 = `${string}@${string}`

/**
 * NIP-05 regex. The localpart is optional, and should be assumed to be `_` otherwise.
 *
 * - 0: full match
 * - 1: name (optional)
 * - 2: domain
 */
export const NIP05_REGEX = /^(?:([\w.+-]+)@)?([\w_-]+(\.[\w_-]+)+)$/
export const isNip05 = (value?: string | null): value is Nip05 => NIP05_REGEX.test(value || '')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _fetch: any

try {
  _fetch = fetch
} catch (_) {
  null
}

export function useFetchImplementation(fetchImplementation: unknown) {
  _fetch = fetchImplementation
}

export async function searchDomain(domain: string, query = ''): Promise<{ [name: string]: string }> {
  try {
    const url = `https://${domain}/.well-known/nostr.json?name=${query}`
    const res = await _fetch(url, { redirect: 'manual' })
    if (res.status !== 200) {
      throw Error('Wrong response code')
    }
    const json = await res.json()
    return json.names
  } catch (_) {
    return {}
  }
}

export async function queryProfile(fullname: string): Promise<ProfilePointer | null> {
  const match = fullname.match(NIP05_REGEX)
  if (!match) return null

  const [, name = '_', domain] = match

  try {
    const url = `https://${domain}/.well-known/nostr.json?name=${name}`
    const res = await _fetch(url, { redirect: 'manual' })
    if (res.status !== 200) {
      throw Error('Wrong response code')
    }
    const json = await res.json()

    const pubkey = json.names[name]
    return pubkey ? { pubkey, relays: json.relays?.[pubkey] } : null
  } catch (_e) {
    return null
  }
}

export async function isValid(pubkey: string, nip05: Nip05): Promise<boolean> {
  const res = await queryProfile(nip05)
  return res ? res.pubkey === pubkey : false
}
