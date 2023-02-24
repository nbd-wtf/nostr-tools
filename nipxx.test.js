/* eslint-env jest */

globalThis.crypto = require('crypto')
const {
  nipxx
} = require('./lib/nostr.cjs')


let username1 = 'me@example.com'
let username2 = '0xc0de4c0ffee@0xc0de4c0ffee.eth.limo'
let address = '0xc0De4c0FFEEC0dE4C0FfeEC0de4c0fFeec0de420' // address checksummed
let caip10 = `eip155:1:${address}`
let password = 'horse staple battery'
let sig1 = '0x'.padEnd(132, 'f')
let sig2 = 'f'.padEnd(129, 'f')
let privKey = 'ad94cd8ca2877102ad92d0fa3d2a918f4903dfb0445e33930e115f56deb733b9'

test('private key from deterministic 0x+signature and identifiers', async () => {
  expect(
    await nipxx.privateKeyFromX(username1, caip10, sig1, password)
  ).toEqual(privKey)
})

test('private key from deterministic signature and identifiers', async () => {
  expect(
    await nipxx.privateKeyFromX(username1, caip10, sig1, password)
  ).toEqual(privKey)
})


test('login key from deterministic signature and identifiers', async () => {
  expect(
    await nipxx.signInWithX(username2, caip10, sig1, password)
  ).toEqual(privKey)
})