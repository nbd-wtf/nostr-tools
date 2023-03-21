/* eslint-env jest */
const ethers = require('ethers')
const fetch = require('node-fetch')
const { nipxx, nip05 } = require('./lib/nostr.cjs')
globalThis.crypto = require('crypto')
require('dotenv').config({ path: '.env.nipxx' })

privateKey = process.env.ETHER_PRIVATE_KEY;
let wallet = new ethers.Wallet(privateKey);

nipxx.useFetchImplementation(fetch)
nip05.useFetchImplementation(fetch)

let username1 = 'nipxxtest1'
let username2 = 'nipxxtest1@sshmatrix.eth.limo'
let petname3 = 'nipxxtest2'
let username3 = 'nipxxtest2@sshmatrix.eth.limo'
// @dev: ↓ YOU MUST ENTER THE CORRESPONDING PRIVATE KEY IN THE .env.nipxx FILE
let address = '0x0d2C290bb3fE24D8D566268d5c41527c519715Db' // ← signing checksummed ethereum pubkey/address 
let info = `eip155:1:${address}`
let password = 'hello dear fucker'
let signature1 = 'f'.padEnd(130, 'f')
let message = `Login to Nostr as ${'username'}\n\nImportant: Please verify the integrity and authenticity of your Nostr client before signing this message.\n${'info'}`;
let promise = wallet.signMessage(message) // ↑ signed by address's private key

// @dev : uses arbitrary signature not linked to any ethereum account to test key generation
// SHOULD result in successful key generation
test('Private Key from Deterministic Signature and Identifiers', async () => {
  let username_ = 'me@example.com'
  expect(
    await nipxx.privateKeyFromX(username_, info, signature1, password)
  ).toEqual('fd6a6c03eadf0db178f79de3a2dd3f0464fb5fac96608842d68ce64da2e40954')

  // without password
  expect(
    await nipxx.privateKeyFromX(username_, info, signature1)
  ).toEqual('897c5140a6e0e09b512c755cfd60829998fb0d046c52fae0846cca045185a52b')

  // 0x+hex signature; SHOULD BE agnostic to '0x' prefix
  expect(
    await nipxx.privateKeyFromX(username_, info, '0x' + signature1, password)
  ).toEqual('fd6a6c03eadf0db178f79de3a2dd3f0464fb5fac96608842d68ce64da2e40954')
})

// @dev : uses arbitrary signature plus NIP-02 identifier to Sign-In-With-X (SIWX)
// SHOULD result in successful key generation and login
test('Login with Deterministic Signature and NIP-02 Identifiers', async () => {
  expect(
    await nipxx.signInWithX(username1, info, signature1, password)
  ).toEqual({
    'petname': username1,
    'privkey': '3f0b9c0ddb02d7056c4908d362c8d03072ef3f2dc1eb10a6ef9706dc3f017198',
    // pubkey : 6cb22c9037a08313f0f1f2cfafebcb14cc57acef43b11c6343e6a0d5b46a4abe
    'profile': null
  })
})

// @dev : uses arbitrary signature on a NIP-05 identifier to Sign-In-With-X (SIWX)
// SHOULD result in 'Invalid Signature/Password' since NIP-05 identifiers must sign in with an X wallet
test('Invalid Signature/Password in NIP-05 Identifiers', async () => {
  await expect(async () => {
    await nipxx.signInWithX(username2, info, signature1, password)
  }).rejects.toThrow('Invalid Signature/Password');
})

// @dev : uses arbitrary signature on an arbitrary non-existent NIP-05 identifier to Sign-In-With-X (SIWX)
// SHOULD result in 'Nostr Profile Not Found' since NIP-05 doesn't exist
test('NIP-05 Identifiers Not Set', async () => {
  await expect(async () => {
    await nipxx.signInWithX('zuck@cash.app', info, signature1, password)
  }).rejects.toThrow('Nostr Profile Not Found');
})

// @dev : uses ethereum signature from a valid NIP-05 identifier with an associated ethereum account to Sign-In-With-Ethereum (SIWE)
// SHOULD result in successful key generation and login from a valid signature verified to originate from the correct ethereum account
test('Login with Deterministic Signature and NIP-05 Identifiers', async () => {
  let signature2 = await promise;
  expect(
    await nipxx.signInWithX(username3, info, signature2, password)
  ).toEqual({
    'petname': petname3,
    'profile': {
      'pubkey': '12345801001efeae691482d5951e0a48d2b29c37e9e80a399c4c8c3da2fdf580',
      'relays': []
    },
    'privkey': '9c3f5a1924bcdf49d1761b8844735dfc6b35b49fa73c7646674954f2869afade'
  })
})