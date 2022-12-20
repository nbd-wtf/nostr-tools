/* eslint-env jest */

const {generatePrivateKey, getPublicKey} = require('./lib/nostr.cjs')

test('test private key generation', () => {
  expect(generatePrivateKey()).toMatch(/[a-f0-9]{64}/)
})

test('test public key generation', () => {
  expect(getPublicKey(generatePrivateKey())).toMatch(/[a-f0-9]{64}/)
})

test('test public key from private key deterministic', () => {
  let sk = generatePrivateKey()
  let pk = getPublicKey(sk)

  for (let i = 0; i < 5; i++) {
    expect(getPublicKey(sk)).toEqual(pk)
  }
})
