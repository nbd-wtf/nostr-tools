import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'

import type { Event } from './core.ts'
import type { Filter } from './filter.ts'

const M = 256
const HLL_HEX_LENGTH = M * 2
const utf8Encoder = new TextEncoder()

export type CountManyDirective = 'reactions' | 'reposts' | 'quotes' | 'replies' | 'comments' | 'followers'

export function getCountManyFilter(target: string, directive: CountManyDirective): Filter {
  switch (directive) {
    case 'reactions':
      return { '#e': [target], kinds: [7] }
    case 'reposts':
      return { '#e': [target], kinds: [6] }
    case 'quotes':
      return { '#q': [target], kinds: [1, 1111] }
    case 'replies':
      return { '#e': [target], kinds: [1] }
    case 'comments':
      return { '#E': [target], kinds: [1111] }
    case 'followers':
      return { '#p': [target], kinds: [3] }
  }
}

export function newHll(): Uint8Array {
  return new Uint8Array(M)
}

export function hllDecode(hex: string): Uint8Array | undefined {
  if (hex.length !== HLL_HEX_LENGTH || !/^[0-9a-fA-F]+$/.test(hex)) return undefined

  const registers = new Uint8Array(M)
  for (let i = 0; i < M; i++) {
    registers[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return registers
}

export function hllEncode(registers: Uint8Array): string {
  if (registers.length !== M) throw new Error(`invalid number of registers ${registers.length}`)

  let hex = ''
  for (let i = 0; i < M; i++) {
    hex += registers[i].toString(16).padStart(2, '0')
  }
  return hex
}

export function computeOffset(filterFirstTagValue: string): number {
  let hex = filterFirstTagValue

  if (!isHex64(hex)) {
    const parts = hex.split(':')
    if (parts.length === 3 && isHex64(parts[1])) {
      hex = parts[1]
    } else {
      hex = bytesToHex(sha256(utf8Encoder.encode(filterFirstTagValue)))
    }
  }

  return parseInt(hex[32], 16) + 8
}

export function getFilterFirstTagValue(filter: Filter): string | undefined {
  for (const key in filter) {
    if (key[0] !== '#') continue

    const values = filter[key as `#${string}`]
    if (Array.isArray(values) && typeof values[0] === 'string') return values[0]
  }

  return undefined
}

export function feedPubkey(hll: Uint8Array, pubkey: string, offset: number): Uint8Array {
  if (offset < 0 || offset > 24) throw new Error(`invalid offset ${offset}`)
  if (!isHex64(pubkey)) throw new Error('pubkey must be 32-byte hex')

  if (hll.length === 0) hll = newHll()
  if (hll.length !== M) throw new Error(`invalid number of registers ${hll.length}`)

  const ri = parseInt(pubkey.slice(offset * 2, offset * 2 + 2), 16)
  const value = countLeadingZeroBitsAfterOffset(pubkey, offset) + 1
  if (value > hll[ri]) hll[ri] = value

  return hll
}

export function feedEvent(hll: Uint8Array, event: Event, offset: number): Uint8Array {
  return feedPubkey(hll, event.pubkey, offset)
}

export function mergeHll(target: Uint8Array, source: Uint8Array): Uint8Array {
  if (target.length === 0) target = newHll()
  if (target.length !== M) throw new Error(`invalid number of registers ${target.length}`)
  if (source.length !== M) throw new Error(`invalid number of registers ${source.length}`)

  for (let i = 0; i < M; i++) {
    if (source[i] > target[i]) target[i] = source[i]
  }

  return target
}

export function estimateCount(hll: Uint8Array): number {
  if (hll.length === 0) return 0
  if (hll.length !== M) throw new Error(`invalid number of registers ${hll.length}`)

  const v = countZeros(hll)
  if (v !== 0) {
    const lc = linearCounting(M, v)
    if (lc <= 220) return Math.floor(lc)
  }

  const estimate = calculateEstimate(hll)
  if (estimate <= M * 3 && v !== 0) return Math.floor(linearCounting(M, v))

  return Math.floor(estimate)
}

function isHex64(value: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(value)
}

function countLeadingZeroBitsAfterOffset(pubkey: string, offset: number): number {
  let zeroBits = 0
  for (let i = offset + 1; i < offset + 8; i++) {
    const byte = parseInt(pubkey.slice(i * 2, i * 2 + 2), 16)
    if (byte === 0) {
      zeroBits += 8
      continue
    }

    let mask = 0x80
    while ((byte & mask) === 0) {
      zeroBits++
      mask >>= 1
    }
    break
  }
  return zeroBits
}

function countZeros(registers: Uint8Array): number {
  let count = 0
  for (let i = 0; i < M; i++) {
    if (registers[i] === 0) count++
  }
  return count
}

function linearCounting(m: number, v: number): number {
  return m * Math.log(m / v)
}

function calculateEstimate(registers: Uint8Array): number {
  let sum = 0
  for (let i = 0; i < M; i++) {
    sum += 1 / 2 ** registers[i]
  }
  return (0.7182725932495458 * M * M) / sum
}
