import * as secp256k1 from '@noble/secp256k1'

export const makeRandom32 = () => secp256k1.utils.randomPrivateKey()
export const sha256 = m => secp256k1.utils.sha256(Uint8Array.from(m))
export const getPublicKey = privateKey =>
  secp256k1.schnorr.getPublicKey(privateKey)
