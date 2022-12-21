/* eslint-env jest */

globalThis.crypto = require('crypto')
const {nip04, getPublicKey, generatePrivateKey} = require('./lib/nostr.cjs')

test('encrypt and decrypt message', async () => {
  let sk1 = generatePrivateKey()
  let sk2 = generatePrivateKey()
  let pk1 = getPublicKey(sk1)
  let pk2 = getPublicKey(sk2)

  expect(
    await nip04.decrypt(sk2, pk1, await nip04.encrypt(sk1, pk2, 'hello'))
  ).toEqual('hello')
})
