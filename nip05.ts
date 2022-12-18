var _fetch = fetch

export function useFetchImplementation(fetchImplementation: any) {
  _fetch = fetchImplementation
}

export async function searchDomain(domain: string, query = '') {
  try {
    let res = await (
      await _fetch(`https://${domain}/.well-known/nostr.json?name=${query}`)
    ).json()

    return res.names
  } catch (_) {
    return []
  }
}

export async function queryName(fullname: string) {
  try {
    let [name, domain] = fullname.split('@')
    if (!domain) return null

    let res = await (
      await _fetch(`https://${domain}/.well-known/nostr.json?name=${name}`)
    ).json()

    return res.names && res.names[name]
  } catch (e) {
    console.error(`${e}`)
    return null
  }
}
