import crossFetch from 'cross-fetch'

const f = (typeof XMLHttpRequest == 'function')
  ? crossFetch
  : fetch
export async function searchDomain(domain, query = '') {
  try {
    let res = await (
      await f(`https://${domain}/.well-known/nostr.json?name=${query}`)
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
      await f(`https://${domain}/.well-known/nostr.json?name=${name}`)
    ).json()

    return res.names && res.names[name]
  } catch (e) {
    console.error(`${e}`)
    return null
  }
}
