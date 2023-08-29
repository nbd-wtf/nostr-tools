import crypto from 'node:crypto'
import {hexToBytes} from '@noble/hashes/utils'

import {encrypt, decrypt, getSharedSecret} from './nip44.ts'
import {getPublicKey, generatePrivateKey} from './keys.ts'

// @ts-ignore
// eslint-disable-next-line no-undef
globalThis.crypto = crypto

test('encrypt and decrypt message', async () => {
  let sk1 = generatePrivateKey()
  let sk2 = generatePrivateKey()
  let pk1 = getPublicKey(sk1)
  let pk2 = getPublicKey(sk2)
  let sharedKey1 = getSharedSecret(sk1, pk2)
  let sharedKey2 = getSharedSecret(sk2, pk1)

  expect(decrypt(hexToBytes(sk1), encrypt(hexToBytes(sk1), 'hello'))).toEqual('hello')
  expect(decrypt(sharedKey2, encrypt(sharedKey1, 'hello'))).toEqual('hello')
})
