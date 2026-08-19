import { test, expect } from 'bun:test'

import { BunkerSigner, createNostrConnectURI } from './nip46.ts'
import { generateSecretKey, getPublicKey } from './pure.ts'

const clientSecretKey = generateSecretKey()
const clientPubkey = getPublicKey(clientSecretKey)

test('createNostrConnectURI always includes the secret', () => {
  const uri = new URL(createNostrConnectURI({ clientPubkey, relays: ['wss://relay.example.com'], secret: 'hunter2' }))

  expect(uri.searchParams.get('secret')).toEqual('hunter2')
})

test('fromURI rejects a URI without a secret', async () => {
  const uri = `nostrconnect://${clientPubkey}?relay=wss://relay.example.com`

  // otherwise a bunker replying `{"result": null}` would match `get('secret')`
  // and become the signer for this client
  await expect(BunkerSigner.fromURI(clientSecretKey, uri)).rejects.toThrow(/no secret/)
})

test('fromURI rejects a URI with an empty secret', async () => {
  const uri = `nostrconnect://${clientPubkey}?relay=wss://relay.example.com&secret=`

  await expect(BunkerSigner.fromURI(clientSecretKey, uri)).rejects.toThrow(/no secret/)
})
