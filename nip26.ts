import * as secp256k1 from '@noble/secp256k1'
import {sha256} from '@noble/hashes/sha256'

import {Event} from './event'
import {utf8Encoder} from './utils'
import {getPublicKey} from './keys'

export type Parameters = {
  pubkey: string // the key to whom the delegation will be given
  kind: number | undefined
  until: number | undefined // delegation will only be valid until this date
  since: number | undefined // delegation will be valid from this date on
}

export type Delegation = {
  from: string // the pubkey who signed the delegation
  to: string // the pubkey that is allowed to use the delegation
  cond: string // the string of conditions as they should be included in the event tag
  sig: string
}

export function createDelegation(
  privateKey: string,
  parameters: Parameters
): Delegation {
  let conditions = []
  if ((parameters.kind || -1) >= 0) conditions.push(`kind=${parameters.kind}`)
  if (parameters.until) conditions.push(`created_at<${parameters.until}`)
  if (parameters.since) conditions.push(`created_at>${parameters.since}`)
  let cond = conditions.join('&')

  if (cond === '')
    throw new Error('refusing to create a delegation without any conditions')

  let sighash = sha256(
    utf8Encoder.encode(`nostr:delegation:${parameters.pubkey}:${cond}`)
  )

  let sig = secp256k1.utils.bytesToHex(
    secp256k1.schnorr.signSync(sighash, privateKey)
  )

  return {
    from: getPublicKey(privateKey),
    to: parameters.pubkey,
    cond,
    sig
  }
}

export function getDelegator(event: Event): string | null {
  // find delegation tag
  let tag = event.tags.find(tag => tag[0] === 'delegation' && tag.length >= 4)
  if (!tag) return null

  let pubkey = tag[1]
  let cond = tag[2]
  let sig = tag[3]

  // check conditions
  let conditions = cond.split('&')
  for (let i = 0; i < conditions.length; i++) {
    let [key, operator, value] = conditions[i].split(/\b/)

    // the supported conditions are just 'kind' and 'created_at' for now
    if (key === 'kind' && operator === '=' && event.kind === parseInt(value))
      continue
    else if (
      key === 'created_at' &&
      operator === '<' &&
      event.created_at < parseInt(value)
    )
      continue
    else if (
      key === 'created_at' &&
      operator === '>' &&
      event.created_at > parseInt(value)
    )
      continue
    else return null // invalid condition
  }

  // check signature
  let sighash = sha256(
    utf8Encoder.encode(`nostr:delegation:${event.pubkey}:${cond}`)
  )
  if (!secp256k1.schnorr.verifySync(sig, sighash, pubkey)) return null

  return pubkey
}
