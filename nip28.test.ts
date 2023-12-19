import { describe, test, expect } from 'bun:test'
import { hexToBytes } from '@noble/hashes/utils'
import { getPublicKey } from './pure.ts'
import * as Kind from './kinds.ts'
import {
  channelCreateEvent,
  channelMetadataEvent,
  channelMessageEvent,
  channelHideMessageEvent,
  channelMuteUserEvent,
  ChannelMetadata,
  ChannelMessageEventTemplate,
} from './nip28.ts'

const privateKey = hexToBytes('d217c1ff2f8a65c3e3a1740db3b9f58b8c848bb45e26d00ed4714e4a0f4ceecf')
const publicKey = getPublicKey(privateKey)

describe('NIP-28 Functions', () => {
  const channelMetadata: ChannelMetadata = {
    name: 'Test Channel',
    about: 'This is a test channel',
    picture: 'https://example.com/picture.jpg',
  }

  test('channelCreateEvent should create an event with given template', () => {
    const template = {
      content: channelMetadata,
      created_at: 1617932115,
    }

    const event = channelCreateEvent(template, privateKey)
    expect(event!.kind).toEqual(Kind.ChannelCreation)
    expect(event!.content).toEqual(JSON.stringify(template.content))
    expect(event!.pubkey).toEqual(publicKey)
  })

  test('channelMetadataEvent should create a signed event with given template', () => {
    const template = {
      channel_create_event_id: 'channel creation event id',
      content: channelMetadata,
      created_at: 1617932115,
    }

    const event = channelMetadataEvent(template, privateKey)
    expect(event!.kind).toEqual(Kind.ChannelMetadata)
    expect(event!.tags).toEqual([['e', template.channel_create_event_id]])
    expect(event!.content).toEqual(JSON.stringify(template.content))
    expect(event!.pubkey).toEqual(publicKey)
    expect(typeof event!.id).toEqual('string')
    expect(typeof event!.sig).toEqual('string')
  })

  test('channelMessageEvent should create a signed message event with given template', () => {
    const template: ChannelMessageEventTemplate = {
      channel_create_event_id: 'channel creation event id',
      relay_url: 'https://relay.example.com',
      content: 'Hello, world!',
      created_at: 1617932115,
    }

    const event = channelMessageEvent(template, privateKey)
    expect(event.kind).toEqual(Kind.ChannelMessage)
    expect(event.tags[0]).toEqual(['e', template.channel_create_event_id, template.relay_url, 'root'])
    expect(event.content).toEqual(template.content)
    expect(event.pubkey).toEqual(publicKey)
    expect(typeof event.id).toEqual('string')
    expect(typeof event.sig).toEqual('string')
  })

  test('channelMessageEvent should create a signed message reply event with given template', () => {
    const template: ChannelMessageEventTemplate = {
      channel_create_event_id: 'channel creation event id',
      reply_to_channel_message_event_id: 'channel message event id',
      relay_url: 'https://relay.example.com',
      content: 'Hello, world!',
      created_at: 1617932115,
    }

    const event = channelMessageEvent(template, privateKey)
    expect(event.kind).toEqual(Kind.ChannelMessage)
    expect(event.tags.find(tag => tag[0] === 'e' && tag[1] === template.channel_create_event_id)).toEqual([
      'e',
      template.channel_create_event_id,
      template.relay_url,
      'root',
    ])
    expect(event.tags.find(tag => tag[0] === 'e' && tag[1] === template.reply_to_channel_message_event_id)).toEqual([
      'e',
      template.reply_to_channel_message_event_id as string,
      template.relay_url,
      'reply',
    ])
    expect(event.content).toEqual(template.content)
    expect(event.pubkey).toEqual(publicKey)
    expect(typeof event.id).toEqual('string')
    expect(typeof event.sig).toEqual('string')
  })

  test('channelHideMessageEvent should create a signed event with given template', () => {
    const template = {
      channel_message_event_id: 'channel message event id',
      content: { reason: 'Inappropriate content' },
      created_at: 1617932115,
    }

    const event = channelHideMessageEvent(template, privateKey)
    expect(event!.kind).toEqual(Kind.ChannelHideMessage)
    expect(event!.tags).toEqual([['e', template.channel_message_event_id]])
    expect(event!.content).toEqual(JSON.stringify(template.content))
    expect(event!.pubkey).toEqual(publicKey)
    expect(typeof event!.id).toEqual('string')
    expect(typeof event!.sig).toEqual('string')
  })

  test('channelMuteUserEvent should create a signed event with given template', () => {
    const template = {
      content: { reason: 'Spamming' },
      created_at: 1617932115,
      pubkey_to_mute: 'pubkey to mute',
    }

    const event = channelMuteUserEvent(template, privateKey)
    expect(event!.kind).toEqual(Kind.ChannelMuteUser)
    expect(event!.tags).toEqual([['p', template.pubkey_to_mute]])
    expect(event!.content).toEqual(JSON.stringify(template.content))
    expect(event!.pubkey).toEqual(publicKey)
    expect(typeof event!.id).toEqual('string')
    expect(typeof event!.sig).toEqual('string')
  })
})
