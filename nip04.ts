import {randomBytes} from '@noble/hashes/utils'
import * as secp256k1 from '@noble/secp256k1'
import {encode as b64encode, decode as b64decode} from 'base64-arraybuffer'

import {utf8Decoder, utf8Encoder} from './utils'

export async function encrypt(
  privkey: string,
  pubkey: string,
  text: string
): Promise<string> {
  const key = secp256k1.getSharedSecret(privkey, '02' + pubkey)
  const normalizedKey = getNormalizedX(key)

  let iv = Uint8Array.from(randomBytes(16))
  let plaintext = utf8Encoder.encode(text)
  let cryptoKey = await crypto.subtle.importKey(
    'raw',
    normalizedKey,
    {name: 'AES-CBC'},
    false,
    ['encrypt']
  )
  let ciphertext = await crypto.subtle.encrypt(
    {name: 'AES-CBC', iv},
    cryptoKey,
    plaintext
  )
  let ctb64 = b64encode(ciphertext)
  let ivb64 = b64encode(iv.buffer)

  return `${ctb64}?iv=${ivb64}`
}

export async function decrypt(
  privkey: string,
  pubkey: string,
  data: string
): Promise<string> {
  let [ctb64, ivb64] = data.split('?iv=')
  let key = secp256k1.getSharedSecret(privkey, '02' + pubkey)
  let normalizedKey = getNormalizedX(key)

  let cryptoKey = await crypto.subtle.importKey(
    'raw',
    normalizedKey,
    {name: 'AES-CBC'},
    false,
    ['decrypt']
  )
  let ciphertext = b64decode(ctb64)
  let iv = b64decode(ivb64)

  let plaintext = await crypto.subtle.decrypt(
    {name: 'AES-CBC', iv},
    cryptoKey,
    ciphertext
  )

  let text = utf8Decoder.decode(plaintext)
  return text
}

function getNormalizedX(key: Uint8Array): Uint8Array {
  return key.slice(1, 33)
}
