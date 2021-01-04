import shajs from 'sha.js'
import BigInteger from 'bigi'
import schnorr from 'bip-schnorr'

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

export function getEventID(event) {
  let hash = shajs('sha256').update(serializeEvent(event)).digest()
  return hash.toString('hex')
}

export function verifySignature(event) {
  try {
    schnorr.verify(
      Buffer.from(event.pubkey, 'hex'),
      Buffer.from(getEventID(event), 'hex'),
      Buffer.from(event.sig, 'hex')
    )
    return true
  } catch (err) {
    return false
  }
}

export function signEvent(event, key) {
  let eventHash = shajs('sha256').update(serializeEvent(event)).digest()
  schnorr
    .sign(new BigInteger(key, 16), eventHash, makeRandom32())
    .toString('hex')
}
