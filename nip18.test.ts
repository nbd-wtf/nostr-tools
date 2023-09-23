import { finishEvent, Kind } from './event.ts'
import { getPublicKey } from './keys.ts'
import { finishRepostEvent, getRepostedEventPointer, getRepostedEvent } from './nip18.ts'
import { buildEvent } from './test-helpers.ts'

const relayUrl = 'https://relay.example.com'

describe('finishRepostEvent + getRepostedEventPointer + getRepostedEvent', () => {
  const privateKey = 'd217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf'

  const publicKey = getPublicKey(privateKey)

  const repostedEvent = finishEvent(
    {
      kind: Kind.Text,
      tags: [
        ['e', 'replied event id'],
        ['p', 'replied event pubkey'],
      ],
      content: 'Replied to a post',
      created_at: 1617932115,
    },
    privateKey,
  )

  it('should create a signed event from a minimal template', () => {
    const template = {
      created_at: 1617932115,
    }

    const event = finishRepostEvent(template, repostedEvent, relayUrl, privateKey)

    expect(event.kind).toEqual(Kind.Repost)
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

  it('should create a signed event from a filled template', () => {
    const template = {
      tags: [['nonstandard', 'tag']],
      content: '' as const,
      created_at: 1617932115,
    }

    const event = finishRepostEvent(template, repostedEvent, relayUrl, privateKey)

    expect(event.kind).toEqual(Kind.Repost)
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

    expect(repostedEventFromContent).toEqual(undefined)
  })
})

describe('getRepostedEventPointer', () => {
  it('should parse an event with only an `e` tag', () => {
    const event = buildEvent({
      kind: Kind.Repost,
      tags: [['e', 'reposted event id', relayUrl]],
    })

    const repostedEventPointer = getRepostedEventPointer(event)

    expect(repostedEventPointer!.id).toEqual('reposted event id')
    expect(repostedEventPointer!.author).toEqual(undefined)
    expect(repostedEventPointer!.relays).toEqual([relayUrl])
  })
})
