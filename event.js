import * as secp256k1 from '@noble/secp256k1'

import {sha256} from './utils'

export function getBlankEvent() {
  return {
    kind: 255,
    pubkey: null,
    content: '',
    tags: [],
    created_at: 0
  }
}

export function serializeEvent(evt) {
  return JSON.stringify([
    0,
    evt.pubkey,
    evt.created_at,
    evt.kind,
    evt.tags || [],
    evt.content
  ])
}

export async function getEventHash(event) {
  let eventHash = await sha256(Buffer.from(serializeEvent(event)))
  return Buffer.from(eventHash).toString('hex')
}

export async function verifySignature(event) {
  return await secp256k1.schnorr.verify(
    event.sig,
    await getEventHash(event),
    event.pubkey
  )
}

export async function signEvent(event, key) {
  let eventHash = await getEventHash(event)
  return await secp256k1.schnorr.sign(eventHash, key)
}
