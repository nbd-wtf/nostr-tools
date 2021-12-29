import {Buffer} from 'buffer'
import createHash from 'create-hash'
import {signSchnorr, verifySchnorr} from 'tiny-secp256k1'

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

export function getEventHash(event) {
  let eventHash = createHash('sha256')
    .update(Buffer.from(serializeEvent(event)))
    .digest()
  return Buffer.from(eventHash).toString('hex')
}

export function verifySignature(event) {
  if (event.id !== getEventHash(event)) return false
  return verifySchnorr(
    Buffer.from(event.id, 'hex'),
    Buffer.from(event.pubkey, 'hex'),
    Buffer.from(event.sig, 'hex')
  )
}

export function signEvent(event, key) {
  let eventHash = Buffer.from(getEventHash(event), 'hex')
  let keyB = Buffer.from(key, 'hex')
  return Buffer.from(signSchnorr(eventHash, keyB)).toString('hex')
}
