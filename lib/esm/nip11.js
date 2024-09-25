// nip11.ts
var _fetch;
try {
  _fetch = fetch;
} catch {
}
function useFetchImplementation(fetchImplementation) {
  _fetch = fetchImplementation;
}
async function fetchRelayInformation(url) {
  return await (await fetch(url.replace("ws://", "http://").replace("wss://", "https://"), {
    headers: { Accept: "application/nostr+json" }
  })).json();
}
export {
  fetchRelayInformation,
  useFetchImplementation
};
