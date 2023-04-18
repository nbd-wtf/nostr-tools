import * as secp256k1 from '@noble/secp256k1'

export function generatePrivateKey(): string {
  return secp256k1.utils.bytesToHex(secp256k1.utils.randomPrivateKey())
}

export function getPublicKey(privateKey: string): string {
  return secp256k1.utils.bytesToHex(secp256k1.schnorr.getPublicKey(privateKey))
}
