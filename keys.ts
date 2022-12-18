import * as secp256k1 from '@noble/secp256k1'
import {Buffer} from 'buffer'

export function generatePrivateKey(): string {
  return Buffer.from(secp256k1.utils.randomPrivateKey()).toString('hex')
}

export function getPublicKey(privateKey: string): string {
  return Buffer.from(secp256k1.schnorr.getPublicKey(privateKey)).toString('hex')
}
