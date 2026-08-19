import { Filter } from './filter.ts'

export type WebAddressPointer = {
  filter: Filter
  relays?: string[]
}

/**
 * NIP-AD regex. Matches a web URL with a path that may have a Nostr counterpart.
 *
 * - 0: full match
 * - 1: domain
 * - 2: path
 */
export const AD_REGEX = /^(?:https?:\/\/)?((?:[\w-]+\.)+[\w-]+)(\/[^\s]*)?$/
export const isWebAddress = (value?: string | null): value is string => AD_REGEX.test(value || '')

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

export async function queryWebAddress(url: string): Promise<WebAddressPointer | null> {
  const match = url.match(AD_REGEX)
  if (!match) return null

  const [, domain, path = '/'] = match

  try {
    const res = await _fetch(`https://${domain}/.well-known/nostr.json?path=${path}`)
    if (res.status !== 200) {
      throw Error('Wrong response code')
    }
    const json = await res.json()
    return json[path] || null
  } catch (_) {
    return null
  }
}
