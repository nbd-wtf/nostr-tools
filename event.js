import * as secp256k1 from 'noble-secp256k1'

import {sha256} from './utils'

export function serializeEvent(evt) {
  return JSON.stringify([
    0,
    evt.pubkey,
    evt.created_at,
    evt.kind,
    evt.tags,
    evt.content
  ])
}

export function getEventHash(event) {
  let eventHash = sha256(Buffer.from(serializeEvent(event)))
  return Buffer.from(eventHash).toString('hex')
}

export async function verifySignature(event) {
  return await secp256k1.schnorr.verify(
    event.signature,
    getEventHash(event),
    event.pubkey
  )
}

export async function signEvent(event, key) {
  let eventHash = getEventHash(event)
  return Buffer.from(await secp256k1.schnorr.sign(key, eventHash)).toString(
    'hex'
  )
}
