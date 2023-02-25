/* eslint-env jest */

globalThis.crypto = require('crypto')
const {
  nipxx
} = require('./lib/nostr.cjs')


let username2 = '0xc0de4c0ffee@0xc0de4c0ffee.eth.limo'
let address = '0xc0De4c0FFEEC0dE4C0FfeEC0de4c0fFeec0de420' // address checksummed
let signer_info = `eip155:1:${address}`
let password = 'horse staple battery'
let sig = 'f'.padEnd(130, 'f')

test('private key from deterministic signature and identifiers', async () => {
  let username = 'me@example.com'
  expect(
    await nipxx.privateKeyFromX(username, signer_info, sig, password)
  ).toEqual('ad94cd8ca2877102ad92d0fa3d2a918f4903dfb0445e33930e115f56deb733b9')

  // without password
  //expect(
  //  await nipxx.privateKeyFromX(username, signer_info, sig)
  //).toEqual('26ef9e1404ce02014e9bb503f6e99f5b9f2792722251856aaa3921222a98ef0e')

  // 0x+hex signature
  expect(
    await nipxx.privateKeyFromX(username, signer_info, '0x' + sig, password)
  ).toEqual('ad94cd8ca2877102ad92d0fa3d2a918f4903dfb0445e33930e115f56deb733b9')
})


test('Login with deterministic signature and NIP02 identifiers', async () => {
  expect(
    await nipxx.signInWithX('user123', signer_info, sig, password)
  ).toEqual({
    'petname': 'user123',
    'privkey': 'e9257bd2c0d05af3533b580551d1964a04a43d53da1fc2167fa425f050e41012',
    'profile': null
  })
})

test('Invalid signature / password in NIP05 identifiers', async () => {
  await expect(async () => {
    await nipxx.signInWithX('0xc0de4c0ffee@0xc0de4c0ffee.eth.limo', signer_info, sig, password)
  }).rejects.toThrow('Invalid Signature/Password');
})

test('NIP05 identifiers not set', async () => {
  await expect(async () => {
    await nipxx.signInWithX('zuck@cash.app', signer_info, sig, password)
  }).rejects.toThrow('Nostr Profile Not Found');
})

test('Login with deterministic signature and NIP05 identifiers', async () => {
  expect(
    await nipxx.signInWithX('nipxxtest@0xc0de4c0ffee.eth.limo', signer_info, sig, password)
  ).toEqual({
    'petname': 'nipxxtest',
    'profile': {
      'pubkey': '2f88ee2dcc3c031533eca9f9185fab3b855e3213ac6861e1ece0ffab3cace470',
      'relays': []
    },
    'privkey': '6a6a9cf580951d436fc30993d7480bf2a28be1ff3b80ae4236a5aaf378c87f0a'
  })
})