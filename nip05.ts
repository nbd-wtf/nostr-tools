import {ProfilePointer} from './nip19'

var _fetch: any

try {
  _fetch = fetch
} catch {}

export function useFetchImplementation(fetchImplementation: any) {
  _fetch = fetchImplementation
}

export async function searchDomain(
  domain: string,
  query = ''
): Promise<{[name: string]: string}> {
  try {
    let res = await (
      await _fetch(`https://${domain}/.well-known/nostr.json?name=${query}`)
    ).json()

    return res.names
  } catch (_) {
    return {}
  }
}

export async function queryProfile(
  fullname: string
): Promise<ProfilePointer | null> {
  let [name, domain] = fullname.split('@')

  if (!domain) {
    // if there is no @, it is because it is just a domain, so assume the name is "_"
    domain = name
    name = '_'
  }

  if (!name.match(/^[a-z0-9-_]+$/)) return null

  let res = await (
    await _fetch(`https://${domain}/.well-known/nostr.json?name=${name}`)
  ).json()

  if (!res?.names?.[name]) return null

  let pubkey = res.names[name] as string
  let relays = (res.relays?.[pubkey] || []) as string[] // nip35

  return {
    pubkey,
    relays
  }
}
