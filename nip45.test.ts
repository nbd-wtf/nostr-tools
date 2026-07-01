import { expect, test } from 'bun:test'

import { computeOffset, estimateCount, feedPubkey, hllDecode, hllEncode, mergeHll, newHll } from './nip45.ts'

const pubkeys = [
  '0000000000000000000000000000000000000000000000000000000000000000',
  'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
  '0000000000000000010000000000000000000000000000000000000000000000',
  '0000000000000000028000000000000000000000000000000000000000000000',
  '0000000000000000024000000000000000000000000000000000000000000000',
]

const goRegisters =
  '39390200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001'

test('matches nostrlib hyperloglog registers and count', () => {
  let hll = newHll()
  for (const pubkey of pubkeys) {
    hll = feedPubkey(hll, pubkey, 8)
  }

  expect(hllEncode(hll)).toBe(goRegisters)
  expect(estimateCount(hll)).toBe(5)
})

test('matches nostrlib hyperloglog merge', () => {
  let full = newHll()
  let left = newHll()
  let right = newHll()

  pubkeys.forEach((pubkey, i) => {
    full = feedPubkey(full, pubkey, 8)
    if (i % 2 === 0) left = feedPubkey(left, pubkey, 8)
    else right = feedPubkey(right, pubkey, 8)
  })

  left = mergeHll(left, right)

  expect(hllEncode(left)).toBe(hllEncode(full))
  expect(hllEncode(left)).toBe(goRegisters)
  expect(estimateCount(left)).toBe(5)
})

test('matches nostrlib MergeRegisters behavior', () => {
  const registers = hllDecode(goRegisters)
  expect(registers).toBeDefined()

  const hll = mergeHll(newHll(), registers!)
  expect(hllEncode(hll)).toBe(goRegisters)
  expect(estimateCount(hll)).toBe(5)
})

test('computes NIP-45 offset', () => {
  expect(computeOffset('00000000000000000000000000000000f0000000000000000000000000000000')).toBe(23)
  expect(computeOffset('30023:00000000000000000000000000000000a0000000000000000000000000000000:test')).toBe(18)
})
