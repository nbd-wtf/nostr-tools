import { test, expect } from 'bun:test'

import { encrypt, decrypt } from './nip04.ts'
import { getPublicKey, generateSecretKey } from './pure.ts'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'

test('encrypt and decrypt message', async () => {
  let sk1 = generateSecretKey()
  let sk2 = generateSecretKey()
  let pk1 = getPublicKey(sk1)
  let pk2 = getPublicKey(sk2)

  let ciphertext = await encrypt(bytesToHex(sk1), pk2, 'hello')

  expect(await decrypt(bytesToHex(sk2), pk1, ciphertext)).toEqual('hello')
})

test('decrypt message from go-nostr', async () => {
  let sk1 = '91ba716fa9e7ea2fcbad360cf4f8e0d312f73984da63d90f524ad61a6a1e7dbe'
  let sk2 = '96f6fa197aa07477ab88f6981118466ae3a982faab8ad5db9d5426870c73d220'
  let pk1 = getPublicKey(hexToBytes(sk1))

  let ciphertext = 'zJxfaJ32rN5Dg1ODjOlEew==?iv=EV5bUjcc4OX2Km/zPp4ndQ=='

  expect(await decrypt(sk2, pk1, ciphertext)).toEqual('nanana')
})

test('decrypt big payload from go-nostr', async () => {
  let sk1 = '91ba716fa9e7ea2fcbad360cf4f8e0d312f73984da63d90f524ad61a6a1e7dbe'
  let sk2 = '96f6fa197aa07477ab88f6981118466ae3a982faab8ad5db9d5426870c73d220'
  let pk1 = getPublicKey(hexToBytes(sk1))

  let ciphertext =
    '6f8dMstm+udOu7yipSn33orTmwQpWbtfuY95NH+eTU1kArysWJIDkYgI2D25EAGIDJsNd45jOJ2NbVOhFiL3ZP/NWsTwXokk34iyHyA/lkjzugQ1bHXoMD1fP/Ay4hB4al1NHb8HXHKZaxPrErwdRDb8qa/I6dXb/1xxyVvNQBHHvmsM5yIFaPwnCN1DZqXf2KbTA/Ekz7Hy+7R+Sy3TXLQDFpWYqykppkXc7Fs0qSuPRyxz5+anuN0dxZa9GTwTEnBrZPbthKkNRrvZMdTGJ6WumOh9aUq8OJJWy9aOgsXvs7qjN1UqcCqQqYaVnEOhCaqWNDsVtsFrVDj+SaLIBvCiomwF4C4nIgngJ5I69tx0UNI0q+ZnvOGQZ7m1PpW2NYP7Yw43HJNdeUEQAmdCPnh/PJwzLTnIxHmQU7n7SPlMdV0SFa6H8y2HHvex697GAkyE5t8c2uO24OnqIwF1tR3blIqXzTSRl0GA6QvrSj2p4UtnWjvF7xT7RiIEyTtgU/AsihTrXyXzWWZaIBJogpgw6erlZqWjCH7sZy/WoGYEiblobOAqMYxax6vRbeuGtoYksr/myX+x9rfLrYuoDRTw4woXOLmMrrj+Mf0TbAgc3SjdkqdsPU1553rlSqIEZXuFgoWmxvVQDtekgTYyS97G81TDSK9nTJT5ilku8NVq2LgtBXGwsNIw/xekcOUzJke3kpnFPutNaexR1VF3ohIuqRKYRGcd8ADJP2lfwMcaGRiplAmFoaVS1YUhQwYFNq9rMLf7YauRGV4BJg/t9srdGxf5RoKCvRo+XM/nLxxysTR9MVaEP/3lDqjwChMxs+eWfLHE5vRWV8hUEqdrWNZV29gsx5nQpzJ4PARGZVu310pQzc6JAlc2XAhhFk6RamkYJnmCSMnb/RblzIATBi2kNrCVAlaXIon188inB62rEpZGPkRIP7PUfu27S/elLQHBHeGDsxOXsBRo1gl3te+raoBHsxo6zvRnYbwdAQa5taDE63eh+fT6kFI+xYmXNAQkU8Dp0MVhEh4JQI06Ni/AKrvYpC95TXXIphZcF+/Pv/vaGkhG2X9S3uhugwWK?iv=2vWkOQQi0WynNJz/aZ4k2g=='
  let plaintext = ''
  for (let i = 0; i < 800; i++) {
    plaintext += 'z'
  }

  expect(await decrypt(sk2, pk1, ciphertext)).toEqual(plaintext)
})
