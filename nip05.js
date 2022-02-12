import fetch from 'cross-fetch'

export async function searchDomain(domain, query = '') {
  try {
    let res = await (
      await fetch(`https://${domain}/.well-known/nostr.json?name=${query}`)
    ).json()

    return res.names
  } catch (_) {
    return []
  }
}

export async function queryName(fullname) {
  try {
    let [name, domain] = fullname.split('@')
    if (!domain) return null

    let res = await (
      await fetch(`https://${domain}/.well-known/nostr.json?name=${name}`)
    ).json()

    return res.names && res.names[name]
  } catch (_) {
    return null
  }
}
