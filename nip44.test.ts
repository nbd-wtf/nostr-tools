import {encrypt, decrypt, getSharedSecret} from './nip44.ts'
import {bytesToHex, hexToBytes} from '@noble/hashes/utils'
import {default as vectors} from './nip44.vectors.json'
import {getPublicKey} from './keys.ts'

test('NIP44: valid_sec', async () => {
  for (const v of vectors.valid_sec) {
    const pub2 = getPublicKey(v.sec2)
    const key = getSharedSecret(v.sec1, pub2)
    expect(bytesToHex(key)).toEqual(v.shared)
    const ciphertext = encrypt(key, v.plaintext, {nonce: hexToBytes(v.nonce)})
    expect(ciphertext).toEqual(v.ciphertext)
    const decrypted = decrypt(key, ciphertext)
    expect(decrypted).toEqual(v.plaintext)
  }
})

test('NIP44: valid_pub', async () => {
  for (const v of vectors.valid_pub) {
    const key = getSharedSecret(v.sec1, v.pub2)
    expect(bytesToHex(key)).toEqual(v.shared)
    const ciphertext = encrypt(key, v.plaintext, {nonce: hexToBytes(v.nonce)})
    expect(ciphertext).toEqual(v.ciphertext)
    const decrypted = decrypt(key, ciphertext)
    expect(decrypted).toEqual(v.plaintext)
  }
})

test('NIP44: invalid', async () => {
  for (const v of vectors.invalid) {
    expect(() => {
      const key = getSharedSecret(v.sec1, v.pub2)
      const ciphertext = encrypt(key, v.plaintext)
    }).toThrowError()
  }
})
