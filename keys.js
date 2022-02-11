import * as secp256k1 from '@noble/secp256k1'

export function generatePrivateKey() {
  return Buffer.from(secp256k1.utils.randomPrivateKey()).toString('hex')
}

export function getPublicKey(privateKey) {
  return Buffer.from(secp256k1.schnorr.getPublicKey(privateKey)).toString('hex')
}
