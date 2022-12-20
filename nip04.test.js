/* eslint-env jest */

const {nip04, getPublicKey, generatePrivateKey} = require('./lib/nostr.cjs')

test('encrypt and decrypt message', () => {
  let sk1 = generatePrivateKey()
  let sk2 = generatePrivateKey()
  let pk1 = getPublicKey(sk1)
  let pk2 = getPublicKey(sk2)

  expect(nip04.decrypt(sk2, pk1, nip04.encrypt(sk1, pk2, 'hello'))).toEqual(
    'hello'
  )
})
