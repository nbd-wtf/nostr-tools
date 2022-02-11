import {Buffer} from 'buffer'
import createHash from 'create-hash'
import * as secp256k1 from '@noble/secp256k1'

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
    evt.tags,
    evt.content
  ])
}

export function getEventHash(event) {
  let eventHash = createHash('sha256')
    .update(Buffer.from(serializeEvent(event)))
    .digest()
  return Buffer.from(eventHash).toString('hex')
}

export function validateEvent(event) {
  if (event.id !== getEventHash(event)) return false
  if (typeof event.content !== 'string') return false
  if (typeof event.created_at !== 'number') return false

  if (!Array.isArray(event.tags)) return false
  for (let i = 0; i < event.tags.length; i++) {
    let tag = event.tags[i]
    if (!Array.isArray(tag)) return false
    for (let j = 0; j < tag.length; j++) {
      if (typeof tag[j] === 'object') return false
    }
  }

  return true
}

export function verifySignature(event) {
  return secp256k1.schnorr.verify(event.sig, event.id, event.pubkey)
}

export async function signEvent(event, key) {
  return Buffer.from(
    await secp256k1.schnorr.sign(getEventHash(event), key)
  ).toString('hex')
}
