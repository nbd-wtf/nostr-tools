// nip05.ts
var NIP05_REGEX = /^(?:([\w.+-]+)@)?([\w_-]+(\.[\w_-]+)+)$/;
var isNip05 = (value) => NIP05_REGEX.test(value || "");
var _fetch;
try {
  _fetch = fetch;
} catch (_) {
  null;
}
function useFetchImplementation(fetchImplementation) {
  _fetch = fetchImplementation;
}
async function searchDomain(domain, query = "") {
  try {
    const url = `https://${domain}/.well-known/nostr.json?name=${query}`;
    const res = await _fetch(url, { redirect: "manual" });
    if (res.status !== 200) {
      throw Error("Wrong response code");
    }
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
  const [, name = "_", domain] = match;
  try {
    const url = `https://${domain}/.well-known/nostr.json?name=${name}`;
    const res = await _fetch(url, { redirect: "manual" });
    if (res.status !== 200) {
      throw Error("Wrong response code");
    }
    const json = await res.json();
    const pubkey = json.names[name];
    return pubkey ? { pubkey, relays: json.relays?.[pubkey] } : null;
  } catch (_e) {
    return null;
  }
}
async function isValid(pubkey, nip05) {
  const res = await queryProfile(nip05);
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
