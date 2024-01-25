import { bytesToHex, concatBytes, hexToBytes } from '@noble/hashes/utils'
import { bech32 } from '@scure/base'

import { utf8Decoder, utf8Encoder } from './utils.ts'

export const Bech32MaxSize = 5000

/**
 * Bech32 regex.
 * @see https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki#bech32
 */
export const BECH32_REGEX = /[\x21-\x7E]{1,83}1[023456789acdefghjklmnpqrstuvwxyz]{6,}/

function integerToUint8Array(number: number) {
  // Create a Uint8Array with enough space to hold a 32-bit integer (4 bytes).
  const uint8Array = new Uint8Array(4)

  // Use bitwise operations to extract the bytes.
  uint8Array[0] = (number >> 24) & 0xff // Most significant byte (MSB)
  uint8Array[1] = (number >> 16) & 0xff
  uint8Array[2] = (number >> 8) & 0xff
  uint8Array[3] = number & 0xff // Least significant byte (LSB)

  return uint8Array
}

export type ProfilePointer = {
  pubkey: string // hex
  relays?: string[]
}

export type EventPointer = {
  id: string // hex
  relays?: string[]
  author?: string
  kind?: number
}

export type AddressPointer = {
  identifier: string
  pubkey: string
  kind: number
  relays?: string[]
}

type Prefixes = {
  nprofile: ProfilePointer
  nrelay: string
  nevent: EventPointer
  naddr: AddressPointer
  nsec: Uint8Array
  npub: string
  note: string
}

type DecodeValue<Prefix extends keyof Prefixes> = {
  type: Prefix
  data: Prefixes[Prefix]
}

export type DecodeResult = {
  [P in keyof Prefixes]: DecodeValue<P>
}[keyof Prefixes]

export function decode<Prefix extends keyof Prefixes>(nip19: `${Prefix}1${string}`): DecodeValue<Prefix>
export function decode(nip19: string): DecodeResult
export function decode(nip19: string): DecodeResult {
  let { prefix, words } = bech32.decode(nip19, Bech32MaxSize)
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
          relays: tlv[1] ? tlv[1].map(d => utf8Decoder.decode(d)) : [],
        },
      }
    }
    case 'nevent': {
      let tlv = parseTLV(data)
      if (!tlv[0]?.[0]) throw new Error('missing TLV 0 for nevent')
      if (tlv[0][0].length !== 32) throw new Error('TLV 0 should be 32 bytes')
      if (tlv[2] && tlv[2][0].length !== 32) throw new Error('TLV 2 should be 32 bytes')
      if (tlv[3] && tlv[3][0].length !== 4) throw new Error('TLV 3 should be 4 bytes')

      return {
        type: 'nevent',
        data: {
          id: bytesToHex(tlv[0][0]),
          relays: tlv[1] ? tlv[1].map(d => utf8Decoder.decode(d)) : [],
          author: tlv[2]?.[0] ? bytesToHex(tlv[2][0]) : undefined,
          kind: tlv[3]?.[0] ? parseInt(bytesToHex(tlv[3][0]), 16) : undefined,
        },
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
          relays: tlv[1] ? tlv[1].map(d => utf8Decoder.decode(d)) : [],
        },
      }
    }

    case 'nrelay': {
      let tlv = parseTLV(data)
      if (!tlv[0]?.[0]) throw new Error('missing TLV 0 for nrelay')

      return {
        type: 'nrelay',
        data: utf8Decoder.decode(tlv[0][0]),
      }
    }

    case 'nsec':
      return { type: prefix, data }

    case 'npub':
    case 'note':
      return { type: prefix, data: bytesToHex(data) }

    default:
      throw new Error(`unknown prefix ${prefix}`)
  }
}

type TLV = { [t: number]: Uint8Array[] }

function parseTLV(data: Uint8Array): TLV {
  let result: TLV = {}
  let rest = data
  while (rest.length > 0) {
    let t = rest[0]
    let l = rest[1]
    let v = rest.slice(2, 2 + l)
    rest = rest.slice(2 + l)
    if (v.length < l) throw new Error(`not enough data to read on TLV ${t}`)
    result[t] = result[t] || []
    result[t].push(v)
  }
  return result
}

export function nsecEncode(key: Uint8Array): `nsec1${string}` {
  return encodeBytes('nsec', key)
}

export function npubEncode(hex: string): `npub1${string}` {
  return encodeBytes('npub', hexToBytes(hex))
}

export function noteEncode(hex: string): `note1${string}` {
  return encodeBytes('note', hexToBytes(hex))
}

function encodeBech32<Prefix extends string>(prefix: Prefix, data: Uint8Array): `${Prefix}1${string}` {
  let words = bech32.toWords(data)
  return bech32.encode(prefix, words, Bech32MaxSize) as `${Prefix}1${string}`
}

export function encodeBytes<Prefix extends string>(prefix: Prefix, bytes: Uint8Array): `${Prefix}1${string}` {
  return encodeBech32(prefix, bytes)
}

export function nprofileEncode(profile: ProfilePointer): `nprofile1${string}` {
  let data = encodeTLV({
    0: [hexToBytes(profile.pubkey)],
    1: (profile.relays || []).map(url => utf8Encoder.encode(url)),
  })
  return encodeBech32('nprofile', data)
}

export function neventEncode(event: EventPointer): `nevent1${string}` {
  let kindArray
  if (event.kind !== undefined) {
    kindArray = integerToUint8Array(event.kind)
  }

  let data = encodeTLV({
    0: [hexToBytes(event.id)],
    1: (event.relays || []).map(url => utf8Encoder.encode(url)),
    2: event.author ? [hexToBytes(event.author)] : [],
    3: kindArray ? [new Uint8Array(kindArray)] : [],
  })

  return encodeBech32('nevent', data)
}

export function naddrEncode(addr: AddressPointer): `naddr1${string}` {
  let kind = new ArrayBuffer(4)
  new DataView(kind).setUint32(0, addr.kind, false)

  let data = encodeTLV({
    0: [utf8Encoder.encode(addr.identifier)],
    1: (addr.relays || []).map(url => utf8Encoder.encode(url)),
    2: [hexToBytes(addr.pubkey)],
    3: [new Uint8Array(kind)],
  })
  return encodeBech32('naddr', data)
}

export function nrelayEncode(url: string): `nrelay1${string}` {
  let data = encodeTLV({
    0: [utf8Encoder.encode(url)],
  })
  return encodeBech32('nrelay', data)
}

function encodeTLV(tlv: TLV): Uint8Array {
  let entries: Uint8Array[] = []

  Object.entries(tlv)
    .reverse()
    .forEach(([t, vs]) => {
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
