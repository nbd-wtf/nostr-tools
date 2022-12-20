var _fetch = fetch

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

export async function queryName(fullname: string): Promise<string> {
  let [name, domain] = fullname.split('@')
  if (!domain) throw new Error('invalid identifier, must contain an @')

  let res = await (
    await _fetch(`https://${domain}/.well-known/nostr.json?name=${name}`)
  ).json()

  return res.names && res.names[name]
}
