import crypto from 'node:crypto'

import {encrypt, decrypt} from './nip44.ts'
import {getPublicKey, generatePrivateKey} from './keys.ts'

test('encrypt and decrypt NIP44 message', async () => {
  let sk1 = generatePrivateKey()
  let sk2 = generatePrivateKey()
  let pk1 = getPublicKey(sk1)
  let pk2 = getPublicKey(sk2)

  expect(
    await decrypt(sk2, pk1, await encrypt(sk1, pk2, 'hello'))
  ).toEqual('hello')
})
