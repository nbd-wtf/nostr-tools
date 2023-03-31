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

// @dev: ↓ YOU MUST ENTER THE CORRESPONDING PRIVATE KEY IN THE .env.nipxx FILE
let address = '0x0d2C290bb3fE24D8D566268d5c41527c519715Db' // ← signing checksummed ethereum pubkey/address
let info = `eip155:1:${address}`

// @dev : uses arbitrary signature not linked to any ethereum account to test key generation
// SHOULD result in successful key generation
test('Private Key from Deterministic Signature and Identifiers', async () => {
  let username = 'me@example.com'
  let signature = 'f'.padEnd(130, 'f')
  let password = 'hello dear fucker'
  expect(
    await nipxx.privateKeyFromX(username, info, signature, password)
  ).toEqual('fd6a6c03eadf0db178f79de3a2dd3f0464fb5fac96608842d68ce64da2e40954')

  // without password
  expect(
    await nipxx.privateKeyFromX(username, info, signature)
  ).toEqual('897c5140a6e0e09b512c755cfd60829998fb0d046c52fae0846cca045185a52b')

  // 0x+hex signature; SHOULD BE agnostic to '0x' prefix
  expect(
    await nipxx.privateKeyFromX(username, info, '0x' + signature, password)
  ).toEqual('fd6a6c03eadf0db178f79de3a2dd3f0464fb5fac96608842d68ce64da2e40954')
})

// @dev : uses arbitrary signature plus NIP-02 identifier to Sign-In-With-X (SIWX)
// SHOULD result in successful key generation and login
test('Login with Deterministic Signature and NIP-02 Identifiers', async () => {
  let username = 'nipxxtest1'
  let signature = 'f'.padEnd(130, 'f')
  let password = 'hello dear fucker'
  expect(
    await nipxx.signInWithX(username, info, signature, password)
  ).toEqual({
    'petname': username,
    'privkey': '3f0b9c0ddb02d7056c4908d362c8d03072ef3f2dc1eb10a6ef9706dc3f017198',
    // pubkey : 6cb22c9037a08313f0f1f2cfafebcb14cc57acef43b11c6343e6a0d5b46a4abe
    'profile': null
  })
})

// @dev : uses arbitrary signature on an arbitrary non-existent NIP-05 identifier to Sign-In-With-X (SIWX) for registration
// SHOULD result in private key generation for registration
test('Generate Public Key for NIP-05 Identifier without verifying record', async () => {
  let username = 'zuck@cash.app'
  let message = `Log into Nostr client as '${username}'\n\nIMPORTANT: Please verify the integrity and authenticity of connected Nostr client before signing this message\n\nSIGNED BY: ${info}`
  let promise = wallet.signMessage(message)
  let signature = await promise;
  let password = ''
  expect(
    await nipxx.signInWithXStandalone('zuck@cash.app', info, signature, password)
  ).toEqual({
    'petname': username.split('@')[0],
    'pubkey': '84ef21c0150c3a6abaf9da9c6e078281c2c1af09abb72a6518dce2ff82c9cb45',
  })
})

// @dev : uses arbitrary signature on a NIP-05 identifier to Sign-In-With-X (SIWX)
// SHOULD result in 'Invalid Signature/Password' since NIP-05 identifiers must sign in with an X wallet
test('Invalid Signature/Password in NIP-05 Identifiers', async () => {
  let username = 'nipxxtest1@sshmatrix.eth.limo'
  let signature = 'f'.padEnd(130, 'f')
  let password = ''
  await expect(async () => {
    await nipxx.signInWithX(username, info, signature, password)
  }).rejects.toThrow('Invalid Signature/Password');
})

// @dev : uses arbitrary signature on an arbitrary non-existent NIP-05 identifier to Sign-In-With-X (SIWX)
// SHOULD result in 'Nostr Profile Not Found' since NIP-05 doesn't exist
test('NIP-05 Identifiers Not Set', async () => {
  let signature = 'f'.padEnd(130, 'f')
  let password = 'hello dear fucker'
  await expect(async () => {
    await nipxx.signInWithX('zuck@cash.app', info, signature, password)
  }).rejects.toThrow('Nostr Profile Not Found');
})

// @dev : uses ethereum signature from a valid NIP-05 identifier with an associated ethereum account to Sign-In-With-Ethereum (SIWE)
// SHOULD result in successful key generation and login from a valid signature verified to originate from the correct ethereum account
test('Login with Deterministic Signature and NIP-05 Identifiers', async () => {
  let username = 'nipxxtest2@sshmatrix.eth.limo'
  let message = `Log into Nostr client as '${username}'\n\nIMPORTANT: Please verify the integrity and authenticity of connected Nostr client before signing this message\n\nSIGNED BY: ${info}`
  let promise = wallet.signMessage(message) // ↑ signed by address's private key
  let signature = await promise;
  let password = 'hello dear fucker'

  expect(
    await nipxx.signInWithX(username, info, signature, password)
  ).toEqual({
    'petname': username.split('@')[0],
    'profile': {
      'pubkey': '7b9debae4b1767d46797c8289172d592e6e713220dcd2647d712c9a229d5ffe0',
      'relays': []
    },
    'privkey': 'ddd49f5dbf378d993a3322c1fc9f2b3357c1c9568655ccba08403ef30f05c416'
  })
})
