import randomBytes from 'randombytes'
import {isPrivate, pointFromScalar} from 'tiny-secp256k1'

export function generatePrivateKey() {
  let i = 8
  while (i--) {
    let r32 = Buffer.from(randomBytes(32))
    if (isPrivate(r32)) return r32.toString('hex')
  }
  throw new Error(
    'Valid private key was not found in 8 iterations. PRNG is broken'
  )
}

export function getPublicKey(privateKey) {
  return Buffer.from(
    pointFromScalar(Buffer.from(privateKey, 'hex'), true)
  ).toString('hex')
}
