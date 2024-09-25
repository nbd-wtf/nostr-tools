// nip05.ts
var NIP05_REGEX = /^(?:([\w.+-]+)@)?([\w_-]+(\.[\w_-]+)+)$/;
var isNip05 = (value) => NIP05_REGEX.test(value || "");
var _fetch;
try {
  _fetch = fetch;
} catch {
}
function useFetchImplementation(fetchImplementation) {
  _fetch = fetchImplementation;
}
async function searchDomain(domain, query = "") {
  try {
    const url = `https://${domain}/.well-known/nostr.json?name=${query}`;
    const res = await _fetch(url, { redirect: "error" });
    const json = await res.json();
    return json.names;
  } catch (_) {
    return {};
  }
}
async function queryProfile(fullname) {
  const match = fullname.match(NIP05_REGEX);
  if (!match)
    return null;
  const [_, name = "_", domain] = match;
  try {
    const url = `https://${domain}/.well-known/nostr.json?name=${name}`;
    const res = await (await _fetch(url, { redirect: "error" })).json();
    let pubkey = res.names[name];
    return pubkey ? { pubkey, relays: res.relays?.[pubkey] } : null;
  } catch (_e) {
    return null;
  }
}
async function isValid(pubkey, nip05) {
  let res = await queryProfile(nip05);
  return res ? res.pubkey === pubkey : false;
}
export {
  NIP05_REGEX,
  isNip05,
  isValid,
  queryProfile,
  searchDomain,
  useFetchImplementation
};
