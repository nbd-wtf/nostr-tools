import { test, expect } from 'bun:test'
import { getPow, minePow } from './nip13.ts'

test('identifies proof-of-work difficulty', async () => {
  const id = '000006d8c378af1779d2feebc7603a125d99eca0ccf1085959b307f64e5dd358'
  const difficulty = getPow(id)
  expect(difficulty).toEqual(21)
})

test('mines POW for an event', async () => {
  const difficulty = 10

  const event = minePow(
    {
      kind: 1,
      tags: [],
      content: 'Hello, world!',
      created_at: 0,
      pubkey: '79c2cae114ea28a981e7559b4fe7854a473521a8d22a66bbab9fa248eb820ff6',
    },
    difficulty,
  )

  expect(getPow(event.id)).toBeGreaterThanOrEqual(difficulty)
})
