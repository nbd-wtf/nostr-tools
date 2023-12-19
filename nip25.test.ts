import { describe, test, expect } from 'bun:test'
import { hexToBytes } from '@noble/hashes/utils'
import { finalizeEvent, getPublicKey } from './pure.ts'
import { Reaction, ShortTextNote } from './kinds.ts'
import { finishReactionEvent, getReactedEventPointer } from './nip25.ts'

describe('finishReactionEvent + getReactedEventPointer', () => {
  const privateKey = hexToBytes('d217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf')
  const publicKey = getPublicKey(privateKey)

  const reactedEvent = finalizeEvent(
    {
      kind: ShortTextNote,
      tags: [
        ['e', 'replied event id'],
        ['p', 'replied event pubkey'],
      ],
      content: 'Replied to a post',
      created_at: 1617932115,
    },
    privateKey,
  )

  test('should create a signed event from a minimal template', () => {
    const template = {
      created_at: 1617932115,
    }

    const event = finishReactionEvent(template, reactedEvent, privateKey)

    expect(event.kind).toEqual(Reaction)
    expect(event.tags).toEqual([
      ['e', 'replied event id'],
      ['p', 'replied event pubkey'],
      ['e', '0ecdbd4dba0652afb19e5f638257a41552a37995a4438ef63de658443f8d16b1'],
      ['p', '6af0f9de588f2c53cedcba26c5e2402e0d0aa64ec7b47c9f8d97b5bc562bab5f'],
    ])
    expect(event.content).toEqual('+')
    expect(event.created_at).toEqual(template.created_at)
    expect(event.pubkey).toEqual(publicKey)
    expect(typeof event.id).toEqual('string')
    expect(typeof event.sig).toEqual('string')

    const reactedEventPointer = getReactedEventPointer(event)

    expect(reactedEventPointer!.id).toEqual(reactedEvent.id)
    expect(reactedEventPointer!.author).toEqual(reactedEvent.pubkey)
  })

  test('should create a signed event from a filled template', () => {
    const template = {
      tags: [['nonstandard', 'tag']],
      content: '👍',
      created_at: 1617932115,
    }

    const event = finishReactionEvent(template, reactedEvent, privateKey)

    expect(event.kind).toEqual(Reaction)
    expect(event.tags).toEqual([
      ['nonstandard', 'tag'],
      ['e', 'replied event id'],
      ['p', 'replied event pubkey'],
      ['e', '0ecdbd4dba0652afb19e5f638257a41552a37995a4438ef63de658443f8d16b1'],
      ['p', '6af0f9de588f2c53cedcba26c5e2402e0d0aa64ec7b47c9f8d97b5bc562bab5f'],
    ])
    expect(event.content).toEqual('👍')
    expect(event.created_at).toEqual(template.created_at)
    expect(event.pubkey).toEqual(publicKey)
    expect(typeof event.id).toEqual('string')
    expect(typeof event.sig).toEqual('string')

    const reactedEventPointer = getReactedEventPointer(event)

    expect(reactedEventPointer!.id).toEqual(reactedEvent.id)
    expect(reactedEventPointer!.author).toEqual(reactedEvent.pubkey)
  })
})
