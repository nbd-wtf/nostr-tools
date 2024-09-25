// nip39.ts
var _fetch;
try {
  _fetch = fetch;
} catch {
}
function useFetchImplementation(fetchImplementation) {
  _fetch = fetchImplementation;
}
async function validateGithub(pubkey, username, proof) {
  try {
    let res = await (await _fetch(`https://gist.github.com/${username}/${proof}/raw`)).text();
    return res === `Verifying that I control the following Nostr public key: ${pubkey}`;
  } catch (_) {
    return false;
  }
}
export {
  useFetchImplementation,
  validateGithub
};
