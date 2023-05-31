import {randomBytes} from '@noble/hashes/utils'
import {secp256k1} from '@noble/curves/secp256k1'
import {base64} from '@scure/base'
import {streamXOR as xchacha20_stream} from '@stablelib/xchacha20';

import {utf8Decoder, utf8Encoder} from './utils.ts'
import { sha256 } from '@noble/hashes/sha256';

// @ts-ignore
if (typeof crypto !== 'undefined' && !crypto.subtle && crypto.webcrypto) {
  // @ts-ignore
  crypto.subtle = crypto.webcrypto.subtle
}

function getConversationKey(privkeyA: string, pubkeyB: string) {
  const key = secp256k1.getSharedSecret(privkeyA, '02' + pubkeyB)
  return sha256(key.slice(1, 33));
}

export async function encrypt(
  privkey: string,
  pubkey: string,
  text: string,
  version = 1
): Promise<string> {
  if (version !== 1) throw new Error('NIP44: unknown encryption version');
  let key = getConversationKey(privkey, pubkey);
  let nonce = randomBytes(24);
  let plaintext = utf8Encoder.encode(text)
  let ciphertext = xchacha20_stream(key, nonce, plaintext, plaintext)
  let ctb64 = base64.encode(ciphertext)
  let nonceb64 = base64.encode(nonce)
  return JSON.stringify({ciphertext: ctb64, nonce: nonceb64, v: 1})
}

export async function decrypt(
  privkey: string,
  pubkey: string,
  data: string
): Promise<string> {
  let dt = JSON.parse(data);
  if (dt.v !== 1) throw new Error('NIP44: unknown encryption version');
  let {ciphertext, nonce} = dt;
  ciphertext = base64.decode(ciphertext)
  nonce = base64.decode(nonce)
  let key = getConversationKey(privkey, pubkey);
  let plaintext = xchacha20_stream(key, nonce, ciphertext, ciphertext)
  let text = utf8Decoder.decode(plaintext)
  return text
}
