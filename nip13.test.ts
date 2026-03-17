import { test, expect } from 'bun:test'
import { getPow, minePow } from './nip13.ts'

test('identifies proof-of-work difficulty', async () => {
  ;[
    ['000006d8c378af1779d2feebc7603a125d99eca0ccf1085959b307f64e5dd358', 21],
    ['6bf5b4f434813c64b523d2b0e6efe18f3bd0cbbd0a5effd8ece9e00fd2531996', 1],
    ['00003479309ecdb46b1c04ce129d2709378518588bed6776e60474ebde3159ae', 18],
    ['01a76167d41add96be4959d9e618b7a35f26551d62c43c11e5e64094c6b53c83', 7],
    ['ac4f44bae06a45ebe88cfbd3c66358750159650a26c0d79e8ccaa92457fca4f6', 0],
    ['0000000000000000006cfbd3c66358750159650a26c0d79e8ccaa92457fca4f6', 73],
  ].forEach(([id, diff]) => expect(getPow(id as string)).toEqual(diff as number))
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
