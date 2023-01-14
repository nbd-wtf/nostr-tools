import * as secp256k1 from '@noble/secp256k1'
import {sha256} from '@noble/hashes/sha256'
import {mnemonicToSeedSync} from '@scure/bip39'
import {HARDENED_OFFSET, HDKey} from '@scure/bip32'

import {getPublicKey} from './keys'
import {Event, getEventHash, Kind, signEvent, verifySignature} from './event'

const MaxKeys = 256

function getRootFromMnemonic(mnemonic: string): HDKey {
  return HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic)).derive(
    `m/44'/1237'/41'`
  )
}

export function getPrivateKeyAtIndex(
  mnemonic: string,
  targetIdx: number
): string {
  let root = getRootFromMnemonic(mnemonic)
  let rootPrivateKey = secp256k1.utils.bytesToHex(root.privateKey as Uint8Array)
  let currentPrivateKey = rootPrivateKey

  for (let idx = 1; idx <= targetIdx; idx++) {
    let hiddenPrivateKey = secp256k1.utils.bytesToHex(
      root.deriveChild(idx + HARDENED_OFFSET).privateKey as Uint8Array
    )
    currentPrivateKey = getChildPrivateKey(currentPrivateKey, hiddenPrivateKey)
  }

  return currentPrivateKey
}

export function getPublicKeyAtIndex(
  root: HDKey,
  targetIdx: number
): Uint8Array {
  let rootPublicKey = root.publicKey as Uint8Array

  let currentPublicKey = rootPublicKey
  for (let idx = 1; idx <= targetIdx; idx++) {
    let hiddenPublicKey = root.deriveChild(idx + HARDENED_OFFSET)
      .publicKey as Uint8Array
    currentPublicKey = getChildPublicKey(currentPublicKey, hiddenPublicKey)
  }

  return currentPublicKey
}

function getIndexOfPublicKey(root: HDKey, publicKey: string): number {
  let rootPublicKey = root.publicKey as Uint8Array
  if (secp256k1.utils.bytesToHex(rootPublicKey).slice(2) === publicKey) return 0

  let currentPublicKey = rootPublicKey
  for (let idx = 1; idx <= MaxKeys; idx++) {
    let hiddenPublicKey = root.deriveChild(idx + HARDENED_OFFSET)
      .publicKey as Uint8Array
    let pubkeyAtIndex = getChildPublicKey(currentPublicKey, hiddenPublicKey)
    if (secp256k1.utils.bytesToHex(pubkeyAtIndex).slice(2) === publicKey)
      return idx

    currentPublicKey = pubkeyAtIndex
  }

  throw new Error(
    `public key ${publicKey} not in the set of the first ${MaxKeys} public keys`
  )
}

export function getChildPublicKey(
  parentPublicKey: Uint8Array,
  hiddenPublicKey: Uint8Array
): Uint8Array {
  if (parentPublicKey.length !== 33 || hiddenPublicKey.length !== 33)
    throw new Error(
      'getChildPublicKey() requires public keys with the leading differentiator byte.'
    )

  let hash = sha256(
    secp256k1.utils.concatBytes(hiddenPublicKey, parentPublicKey)
  )
  let hashPoint = secp256k1.Point.fromPrivateKey(hash)
  let point = secp256k1.Point.fromHex(hiddenPublicKey).add(hashPoint)
  return point.toRawBytes(true)
}

export function getChildPrivateKey(
  parentPrivateKey: string,
  hiddenPrivateKey: string
): string {
  let parentPublicKey = secp256k1.getPublicKey(parentPrivateKey, true)
  let hiddenPublicKey = secp256k1.getPublicKey(hiddenPrivateKey, true)
  let hash = sha256(
    secp256k1.utils.concatBytes(hiddenPublicKey, parentPublicKey)
  )
  let hashScalar = BigInt(`0x${secp256k1.utils.bytesToHex(hash)}`)
  let hiddenPrivateKeyScalar = BigInt(`0x${hiddenPrivateKey}`)
  let sumScalar = hiddenPrivateKeyScalar + hashScalar
  let modulo = secp256k1.utils.mod(sumScalar, secp256k1.CURVE.n)
  return modulo.toString(16).padStart(64, '0')
}

export function buildRevocationEvent(
  mnemonic: string,
  compromisedKey: string,
  content = ''
): {
  parentPrivateKey: string
  event: Event
} {
  let root = getRootFromMnemonic(mnemonic)
  let idx = getIndexOfPublicKey(root, compromisedKey)
  let hiddenKey = secp256k1.utils.bytesToHex(
    root.deriveChild(idx + HARDENED_OFFSET).publicKey as Uint8Array
  )
  let parentPrivateKey = getPrivateKeyAtIndex(mnemonic, idx - 1)
  let parentPublicKey = getPublicKey(parentPrivateKey)

  let event: Event = {
    kind: 13,
    tags: [
      ['p', compromisedKey],
      ['hidden-key', hiddenKey]
    ],
    created_at: Math.round(Date.now() / 1000),
    content,
    pubkey: parentPublicKey
  }

  event.sig = signEvent(event, parentPrivateKey)
  event.id = getEventHash(event)

  return {parentPrivateKey, event}
}

export function validateRevocation(event: Event): boolean {
  if (event.kind !== Kind.StatelessRevocation) return false
  if (!verifySignature(event)) return false

  let invalidKeyTag = event.tags.find(([t, v]) => t === 'p' && v)
  if (!invalidKeyTag) return false
  let invalidKey = invalidKeyTag[1]

  let hiddenKeyTag = event.tags.find(([t, v]) => t === 'hidden-key' && v)
  if (!hiddenKeyTag) return false
  let hiddenKey = secp256k1.utils.hexToBytes(hiddenKeyTag[1])
  if (hiddenKey.length !== 33) return false

  let currentKeyAlt1 = secp256k1.utils.hexToBytes('02' + event.pubkey)
  let currentKeyAlt2 = secp256k1.utils.hexToBytes('03' + event.pubkey)
  let childKeyAlt1 = secp256k1.utils
    .bytesToHex(getChildPublicKey(currentKeyAlt1, hiddenKey))
    .slice(2)
  let childKeyAlt2 = secp256k1.utils
    .bytesToHex(getChildPublicKey(currentKeyAlt2, hiddenKey))
    .slice(2)

  return childKeyAlt1 === invalidKey || childKeyAlt2 === invalidKey
}
