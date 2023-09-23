import { schnorr } from '@noble/curves/secp256k1'
import { bytesToHex } from '@noble/hashes/utils'

export function generatePrivateKey(): string {
  return bytesToHex(schnorr.utils.randomPrivateKey())
}

export function getPublicKey(privateKey: string): string {
  return bytesToHex(schnorr.getPublicKey(privateKey))
}
