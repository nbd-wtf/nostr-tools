import {bytesToHex, concatBytes, hexToBytes} from '@noble/hashes/utils'
import {bech32} from '@scure/base'

import {utf8Decoder, utf8Encoder} from './utils.ts'

const Bech32MaxSize = 5000

/**
 * Bech32 regex.
 * @see https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki#bech32
 */
export const BECH32_REGEX =
  /[\x21-\x7E]{1,83}1[023456789acdefghjklmnpqrstuvwxyz]{6,}/

export type ProfilePointer = {
  pubkey: string // hex
  relays?: string[]
}

export type EventPointer = {
  id: string // hex
  relays?: string[]
  author?: string
}

export type AddressPointer = {
  identifier: string
  pubkey: string
  kind: number
  relays?: string[]
}

export type DecodeResult =
  | {type: 'nprofile'; data: ProfilePointer}
  | {type: 'nrelay'; data: string}
  | {type: 'nevent'; data: EventPointer}
  | {type: 'naddr'; data: AddressPointer}
  | {type: 'nsec'; data: string}
  | {type: 'npub'; data: string}
  | {type: 'note'; data: string}

export function decode(nip19: string): DecodeResult {
  let {prefix, words} = bech32.decode(nip19, Bech32MaxSize)
  let data = new Uint8Array(bech32.fromWords(words))

  switch (prefix) {
    case 'nprofile': {
      let tlv = parseTLV(data)
      if (!tlv[0]?.[0]) throw new Error('missing TLV 0 for nprofile')
      if (tlv[0][0].length !== 32) throw new Error('TLV 0 should be 32 bytes')

      return {
        type: 'nprofile',
        data: {
          pubkey: bytesToHex(tlv[0][0]),
          relays: tlv[1] ? tlv[1].map(d => utf8Decoder.decode(d)) : []
        }
      }
    }
    case 'nevent': {
      let tlv = parseTLV(data)
      if (!tlv[0]?.[0]) throw new Error('missing TLV 0 for nevent')
      if (tlv[0][0].length !== 32) throw new Error('TLV 0 should be 32 bytes')
      if (tlv[2] && tlv[2][0].length !== 32)
        throw new Error('TLV 2 should be 32 bytes')

      return {
        type: 'nevent',
        data: {
          id: bytesToHex(tlv[0][0]),
          relays: tlv[1] ? tlv[1].map(d => utf8Decoder.decode(d)) : [],
          author: tlv[2]?.[0]
            ? bytesToHex(tlv[2][0])
            : undefined
        }
      }
    }

    case 'naddr': {
      let tlv = parseTLV(data)
      if (!tlv[0]?.[0]) throw new Error('missing TLV 0 for naddr')
      if (!tlv[2]?.[0]) throw new Error('missing TLV 2 for naddr')
      if (tlv[2][0].length !== 32) throw new Error('TLV 2 should be 32 bytes')
      if (!tlv[3]?.[0]) throw new Error('missing TLV 3 for naddr')
      if (tlv[3][0].length !== 4) throw new Error('TLV 3 should be 4 bytes')

      return {
        type: 'naddr',
        data: {
          identifier: utf8Decoder.decode(tlv[0][0]),
          pubkey: bytesToHex(tlv[2][0]),
          kind: parseInt(bytesToHex(tlv[3][0]), 16),
          relays: tlv[1] ? tlv[1].map(d => utf8Decoder.decode(d)) : []
        }
      }
    }

    case 'nrelay': {
      let tlv = parseTLV(data)
      if (!tlv[0]?.[0]) throw new Error('missing TLV 0 for nrelay')

      return {
        type: 'nrelay',
        data: utf8Decoder.decode(tlv[0][0])
      }
    }

    case 'nsec':
    case 'npub':
    case 'note':
      return {type: prefix, data: bytesToHex(data)}

    default:
      throw new Error(`unknown prefix ${prefix}`)
  }
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
  let data = hexToBytes(hex)
  let words = bech32.toWords(data)
  return bech32.encode(prefix, words, Bech32MaxSize)
}

export function nprofileEncode(profile: ProfilePointer): string {
  let data = encodeTLV({
    0: [hexToBytes(profile.pubkey)],
    1: (profile.relays || []).map(url => utf8Encoder.encode(url))
  })
  let words = bech32.toWords(data)
  return bech32.encode('nprofile', words, Bech32MaxSize)
}

export function neventEncode(event: EventPointer): string {
  let data = encodeTLV({
    0: [hexToBytes(event.id)],
    1: (event.relays || []).map(url => utf8Encoder.encode(url)),
    2: event.author ? [hexToBytes(event.author)] : []
  })
  let words = bech32.toWords(data)
  return bech32.encode('nevent', words, Bech32MaxSize)
}

export function naddrEncode(addr: AddressPointer): string {
  let kind = new ArrayBuffer(4)
  new DataView(kind).setUint32(0, addr.kind, false)

  let data = encodeTLV({
    0: [utf8Encoder.encode(addr.identifier)],
    1: (addr.relays || []).map(url => utf8Encoder.encode(url)),
    2: [hexToBytes(addr.pubkey)],
    3: [new Uint8Array(kind)]
  })
  let words = bech32.toWords(data)
  return bech32.encode('naddr', words, Bech32MaxSize)
}

export function nrelayEncode(url: string): string {
  let data = encodeTLV({
    0: [utf8Encoder.encode(url)]
  })
  let words = bech32.toWords(data)
  return bech32.encode('nrelay', words, Bech32MaxSize)
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

  return concatBytes(...entries)
}
