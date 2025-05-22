import { describe, test, expect } from 'bun:test'
import { hexToBytes } from '@noble/hashes/utils'
import { EventTemplate, finalizeEvent, getPublicKey } from './pure.ts'
import { GenericRepost, Repost, ShortTextNote, BadgeDefinition as BadgeDefinitionKind } from './kinds.ts'
import { finishRepostEvent, getRepostedEventPointer, getRepostedEvent } from './nip18.ts'
import { buildEvent } from './test-helpers.ts'

const relayUrl = 'https://relay.example.com'

describe('finishRepostEvent + getRepostedEventPointer + getRepostedEvent', () => {
  const privateKey = hexToBytes('d217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf')
  const publicKey = getPublicKey(privateKey)

  const repostedEvent = finalizeEvent(
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

    const event = finishRepostEvent(template, repostedEvent, relayUrl, privateKey)

    expect(event.kind).toEqual(Repost)
    expect(event.tags).toEqual([
      ['e', repostedEvent.id, relayUrl],
      ['p', repostedEvent.pubkey],
    ])
    expect(event.content).toEqual(JSON.stringify(repostedEvent))
    expect(event.created_at).toEqual(template.created_at)
    expect(event.pubkey).toEqual(publicKey)
    expect(typeof event.id).toEqual('string')
    expect(typeof event.sig).toEqual('string')

    const repostedEventPointer = getRepostedEventPointer(event)

    expect(repostedEventPointer!.id).toEqual(repostedEvent.id)
    expect(repostedEventPointer!.author).toEqual(repostedEvent.pubkey)
    expect(repostedEventPointer!.relays).toEqual([relayUrl])

    const repostedEventFromContent = getRepostedEvent(event)

    expect(repostedEventFromContent).toEqual(repostedEvent)
  })

  test('should create a signed event from a filled template', () => {
    const template = {
      tags: [['nonstandard', 'tag']],
      content: '' as const,
      created_at: 1617932115,
    }

    const event = finishRepostEvent(template, repostedEvent, relayUrl, privateKey)

    expect(event.kind).toEqual(Repost)
    expect(event.tags).toEqual([
      ['nonstandard', 'tag'],
      ['e', repostedEvent.id, relayUrl],
      ['p', repostedEvent.pubkey],
    ])
    expect(event.content).toEqual('')
    expect(event.created_at).toEqual(template.created_at)
    expect(event.pubkey).toEqual(publicKey)
    expect(typeof event.id).toEqual('string')
    expect(typeof event.sig).toEqual('string')

    const repostedEventPointer = getRepostedEventPointer(event)

    expect(repostedEventPointer!.id).toEqual(repostedEvent.id)
    expect(repostedEventPointer!.author).toEqual(repostedEvent.pubkey)
    expect(repostedEventPointer!.relays).toEqual([relayUrl])

    const repostedEventFromContent = getRepostedEvent(event)

    expect(repostedEventFromContent).toBeUndefined()
  })
})

describe('GenericRepost', () => {
  const privateKey = hexToBytes('d217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf')
  const publicKey = getPublicKey(privateKey)

  const eventTemplate: EventTemplate = {
    content: '',
    created_at: 1617932114,
    kind: BadgeDefinitionKind,
    tags: [
      ['d', 'badge-id'],
      ['name', 'Badge Name'],
      ['description', 'Badge Description'],
      ['image', 'https://example.com/badge.png', '1024x1024'],
      ['thumb', 'https://example.com/thumb.png', '100x100'],
      ['thumb', 'https://example.com/thumb2.png', '200x200'],
    ],
  }

  const repostedEvent = finalizeEvent(eventTemplate, privateKey)
  test('should create a generic reposted event', () => {
    const template = { created_at: 1617932115 }
    const event = finishRepostEvent(template, repostedEvent, relayUrl, privateKey)

    expect(event.kind).toEqual(GenericRepost)
    expect(event.tags).toEqual([
      ['e', repostedEvent.id, relayUrl],
      ['p', repostedEvent.pubkey],
      ['k', '30009'],
    ])
    expect(event.content).toEqual(JSON.stringify(repostedEvent))
    expect(event.created_at).toEqual(template.created_at)
    expect(event.pubkey).toEqual(publicKey)

    const repostedEventPointer = getRepostedEventPointer(event)

    expect(repostedEventPointer!.id).toEqual(repostedEvent.id)
    expect(repostedEventPointer!.author).toEqual(repostedEvent.pubkey)
    expect(repostedEventPointer!.relays).toEqual([relayUrl])

    const repostedEventFromContent = getRepostedEvent(event)

    expect(repostedEventFromContent).toEqual(repostedEvent)
  })
})

describe('getRepostedEventPointer', () => {
  test('should parse an event with only an `e` tag', () => {
    const event = buildEvent({
      kind: Repost,
      tags: [['e', 'reposted event id', relayUrl]],
    })

    const repostedEventPointer = getRepostedEventPointer(event)

    expect(repostedEventPointer!.id).toEqual('reposted event id')
    expect(repostedEventPointer!.author).toBeUndefined()
    expect(repostedEventPointer!.relays).toEqual([relayUrl])
  })
})

describe('finishRepostEvent', () => {
  const privateKey = hexToBytes('d217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf')

  test('should create an event with empty content if the reposted event is protected', () => {
    const repostedEvent = finalizeEvent(
      {
        kind: ShortTextNote,
        tags: [['-']],
        content: 'Replied to a post',
        created_at: 1617932115,
      },
      privateKey,
    )
    const template = {
      created_at: 1617932115,
    }

    const event = finishRepostEvent(template, repostedEvent, relayUrl, privateKey)

    expect(event.content).toBe('')
  })
})
