export function makeRandom32() {
  var array = new Uint32Array(32)
  window.crypto.getRandomValues(array)
  return Buffer.from(array)
}
