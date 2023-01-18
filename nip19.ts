import * as secp256k1 from '@noble/secp256k1'
import {bech32} from '@scure/base'

import {utf8Decoder, utf8Encoder} from './utils'

const Bech32MaxSize = 5000

export type ProfilePointer = {
  pubkey: string // hex
  relays?: string[]
}

export type EventPointer = {
  id: string // hex
  relays?: string[]
}

export function decode(nip19: string): {
  type: string
  data: ProfilePointer | EventPointer | string
} {
  let {prefix, words} = bech32.decode(nip19, Bech32MaxSize)
  let data = new Uint8Array(bech32.fromWords(words))

  if (prefix === 'nprofile') {
    let tlv = parseTLV(data)
    if (!tlv[0]?.[0]) throw new Error('missing TLV 0 for nprofile')
    if (tlv[0][0].length !== 32) throw new Error('TLV 0 should be 32 bytes')

    return {
      type: 'nprofile',
      data: {
        pubkey: secp256k1.utils.bytesToHex(tlv[0][0]),
        relays: tlv[1].map(d => utf8Decoder.decode(d))
      }
    }
  }

  if (prefix === 'nevent') {
    let tlv = parseTLV(data)
    if (!tlv[0]?.[0]) throw new Error('missing TLV 0 for nevent')
    if (tlv[0][0].length !== 32) throw new Error('TLV 0 should be 32 bytes')

    return {
      type: 'nevent',
      data: {
        id: secp256k1.utils.bytesToHex(tlv[0][0]),
        relays: tlv[1].map(d => utf8Decoder.decode(d))
      }
    }
  }

  if (prefix === 'nsec' || prefix === 'npub' || prefix === 'note') {
    return {type: prefix, data: secp256k1.utils.bytesToHex(data)}
  }

  throw new Error(`unknown prefix ${prefix}`)
}

type TLV = {[t: number]: Uint8Array[]}

function parseTLV(data: Uint8Array): TLV {
  let result: TLV = {}
  let rest = data
  while (rest.length > 0) {
    let t = rest[0]
    let l = rest[1]
    let v = rest.slice(2, 2 + l)
    rest = rest.slice(2 + l)
    if (v.length < l) continue
    result[t] = result[t] || []
    result[t].push(v)
  }
  return result
}

export function nsecEncode(hex: string): string {
  return encodeBytes('nsec', hex)
}

export function npubEncode(hex: string): string {
  return encodeBytes('npub', hex)
}

export function noteEncode(hex: string): string {
  return encodeBytes('note', hex)
}

function encodeBytes(prefix: string, hex: string): string {
  let data = secp256k1.utils.hexToBytes(hex)
  let words = bech32.toWords(data)
  return bech32.encode(prefix, words, Bech32MaxSize)
}

export function nprofileEncode(profile: ProfilePointer): string {
  let data = encodeTLV({
    0: [secp256k1.utils.hexToBytes(profile.pubkey)],
    1: (profile.relays || []).map(url => utf8Encoder.encode(url))
  })
  let words = bech32.toWords(data)
  return bech32.encode('nprofile', words, Bech32MaxSize)
}

export function neventEncode(event: EventPointer): string {
  let data = encodeTLV({
    0: [secp256k1.utils.hexToBytes(event.id)],
    1: (event.relays || []).map(url => utf8Encoder.encode(url))
  })
  let words = bech32.toWords(data)
  return bech32.encode('nevent', words, Bech32MaxSize)
}

function encodeTLV(tlv: TLV): Uint8Array {
  let entries: Uint8Array[] = []

  Object.entries(tlv).forEach(([t, vs]) => {
    vs.forEach(v => {
      let entry = new Uint8Array(v.length + 2)
      entry.set([parseInt(t)], 0)
      entry.set([v.length], 1)
      entry.set(v, 2)
      entries.push(entry)
    })
  })

  return secp256k1.utils.concatBytes(...entries)
}
