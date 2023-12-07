import { encrypt, decrypt, utils } from './nip44.ts'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'
import { v2 as vectors } from './nip44.vectors.json'
import { getPublicKey } from './keys.ts'

test('NIP44: valid_sec', async () => {
  for (const v of vectors.valid_sec) {
    const pub2 = getPublicKey(v.sec2)
    const key = utils.v2.getConversationKey(v.sec1, pub2)
    expect(bytesToHex(key)).toEqual(v.shared)
    const ciphertext = encrypt(key, v.plaintext, { salt: hexToBytes(v.salt) })
    expect(ciphertext).toEqual(v.ciphertext)
    const decrypted = decrypt(key, ciphertext)
    expect(decrypted).toEqual(v.plaintext)
  }
})

test('NIP44: valid_pub', async () => {
  for (const v of vectors.valid_pub) {
    const key = utils.v2.getConversationKey(v.sec1, v.pub2)
    expect(bytesToHex(key)).toEqual(v.shared)
    const ciphertext = encrypt(key, v.plaintext, { salt: hexToBytes(v.salt) })
    expect(ciphertext).toEqual(v.ciphertext)
    const decrypted = decrypt(key, ciphertext)
    expect(decrypted).toEqual(v.plaintext)
  }
})

test('NIP44: invalid', async () => {
  for (const v of vectors.invalid) {
    expect(() => {
      const key = utils.v2.getConversationKey(v.sec1, v.pub2)
      const _ciphertext = decrypt(key, v.ciphertext)
    }).toThrow(v.note)
  }
})

test('NIP44: invalid_conversation_key', async () => {
  for (const v of vectors.invalid_conversation_key) {
    expect(() => {
      const key = utils.v2.getConversationKey(v.sec1, v.pub2)
      const _ciphertext = encrypt(key, 'a')
    }).toThrow()
  }
})

test('NIP44: v1 calcPadding', () => {
  for (const [len, shouldBePaddedTo] of vectors.padding) {
    const actual = utils.v2.calcPadding(len)
    expect(actual).toEqual(shouldBePaddedTo)
  }
})

// To re-generate vectors and produce new ones:
// Create regen.mjs with this content:
// import {getPublicKey, nip44} from './lib/esm/nostr.mjs'
// import {bytesToHex, hexToBytes} from '@noble/hashes/utils'
// import vectors from './nip44.vectors.json' assert { type: "json" };
// function genVectors(v) {
//   const pub2 = v.pub2 ?? getPublicKey(v.sec2);
//   let sharedKey = nip44.utils.v2.getConversationKey(v.sec1, pub2)
//   let ciphertext = nip44.encrypt(sharedKey, v.plaintext, { salt: hexToBytes(v.salt) })
//   console.log({
//     sec1: v.sec1,
//     pub2: pub2,
//     sharedKey: bytesToHex(sharedKey),
//     salt: v.salt,
//     plaintext: v.plaintext,
//     ciphertext
//   })
// }
// for (let v of vectors.valid_sec) genVectors(v);
// for (let v of vectors.valid_pub) genVectors(v);
// const padded = concatBytes(utils.v2.pad(plaintext), new Uint8Array(250))
// const mac = randomBytes(32)
