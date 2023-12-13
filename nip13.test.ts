import { getPow, minePow, verifyPow } from './nip13.ts'
import { getPublicKey } from './keys.ts'
import { type UnsignedEvent, type Event, getEventHash, finishEvent } from './event.ts'

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

function fakePow<K extends number>(unsigned: UnsignedEvent<K>, targetDifficulty: number, difficulty: number): Omit<Event<K>, 'sig'> {
  let count = 0

  const event = unsigned as Omit<Event<K>, 'sig'>
  const tag = ['nonce', count.toString(), targetDifficulty.toString()]

  event.tags.push(tag)

  while (true) {
    const now = Math.floor(new Date().getTime() / 1000)

    if (now !== event.created_at) {
      count = 0
      event.created_at = now
    }

    tag[1] = (++count).toString()

    event.id = getEventHash(event)

    if (getPow(event.id) >= difficulty) {
      break
    }
  }

  return event
}

describe('verifyPow', () => {
  it('should return difficulty 10', () => {
    const difficulty = 10

    const privateKey = 'd217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf'
    const publicKey = getPublicKey(privateKey)
    const unsignedEvent = minePow(
      {
        kind: 1,
        tags: [],
        content: 'Hello, world!',
        created_at: 0,
        pubkey: publicKey,
      },
      difficulty,
    )

    const event = finishEvent(unsignedEvent, privateKey);

    expect(verifyPow(event)).toBeGreaterThanOrEqual(difficulty)
  })

  it('should return difficulty 0 for no nonce tag', () => {
    const difficulty = 10

    const privateKey = 'd217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf'
    const publicKey = getPublicKey(privateKey)
    const unsignedEvent = minePow(
      {
        kind: 1,
        tags: [],
        content: 'Hello, world!',
        created_at: 0,
        pubkey: publicKey,
      },
      difficulty,
    )

    const event = finishEvent(unsignedEvent, privateKey);

    let noNonceTagEvent = event;
    noNonceTagEvent.tags = [];

    expect(verifyPow(noNonceTagEvent)).toEqual(0)
  })

  it('should return difficulty 5- target difficulty is lower than difficulty from hash', () => {
    const targetDifficulty = 5
    const difficulty = 10

    const privateKey = 'd217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf'
    const publicKey = getPublicKey(privateKey)
    const unsignedEvent = fakePow(
      {
        kind: 1,
        tags: [],
        content: 'Hello, world!',
        created_at: 0,
        pubkey: publicKey,
      },
      targetDifficulty,
      difficulty
    )

    const event = finishEvent(unsignedEvent, privateKey);

    expect(verifyPow(event)).toBeLessThan(getPow(event.id))
    expect(verifyPow(event)).toEqual(targetDifficulty)
  })
})