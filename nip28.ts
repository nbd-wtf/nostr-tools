import { Event, finalizeEvent } from './pure.ts'
import { ChannelCreation, ChannelHideMessage, ChannelMessage, ChannelMetadata, ChannelMuteUser } from './kinds.ts'

export interface ChannelMetadata {
  name: string
  about: string
  picture: string
}

export interface ChannelCreateEventTemplate {
  /* JSON string containing ChannelMetadata as defined for Kind 40 and 41 in nip-28. */
  content: string | ChannelMetadata
  created_at: number
  tags?: string[][]
}

export interface ChannelMetadataEventTemplate {
  channel_create_event_id: string
  /* JSON string containing ChannelMetadata as defined for Kind 40 and 41 in nip-28. */
  content: string | ChannelMetadata
  created_at: number
  tags?: string[][]
}

export interface ChannelMessageEventTemplate {
  channel_create_event_id: string
  reply_to_channel_message_event_id?: string
  relay_url: string
  content: string
  created_at: number
  tags?: string[][]
}

export interface ChannelHideMessageEventTemplate {
  channel_message_event_id: string
  content: string | { reason: string }
  created_at: number
  tags?: string[][]
}

export interface ChannelMuteUserEventTemplate {
  content: string | { reason: string }
  created_at: number
  pubkey_to_mute: string
  tags?: string[][]
}

export const channelCreateEvent = (t: ChannelCreateEventTemplate, privateKey: Uint8Array): Event | undefined => {
  let content: string
  if (typeof t.content === 'object') {
    content = JSON.stringify(t.content)
  } else if (typeof t.content === 'string') {
    content = t.content
  } else {
    return undefined
  }

  return finalizeEvent(
    {
      kind: ChannelCreation,
      tags: [...(t.tags ?? [])],
      content: content,
      created_at: t.created_at,
    },
    privateKey,
  )
}

export const channelMetadataEvent = (t: ChannelMetadataEventTemplate, privateKey: Uint8Array): Event | undefined => {
  let content: string
  if (typeof t.content === 'object') {
    content = JSON.stringify(t.content)
  } else if (typeof t.content === 'string') {
    content = t.content
  } else {
    return undefined
  }

  return finalizeEvent(
    {
      kind: ChannelMetadata,
      tags: [['e', t.channel_create_event_id], ...(t.tags ?? [])],
      content: content,
      created_at: t.created_at,
    },
    privateKey,
  )
}

export const channelMessageEvent = (t: ChannelMessageEventTemplate, privateKey: Uint8Array): Event => {
  const tags = [['e', t.channel_create_event_id, t.relay_url, 'root']]

  if (t.reply_to_channel_message_event_id) {
    tags.push(['e', t.reply_to_channel_message_event_id, t.relay_url, 'reply'])
  }

  return finalizeEvent(
    {
      kind: ChannelMessage,
      tags: [...tags, ...(t.tags ?? [])],
      content: t.content,
      created_at: t.created_at,
    },
    privateKey,
  )
}

/* "e" tag should be the kind 42 event to hide */
export const channelHideMessageEvent = (
  t: ChannelHideMessageEventTemplate,
  privateKey: Uint8Array,
): Event | undefined => {
  let content: string
  if (typeof t.content === 'object') {
    content = JSON.stringify(t.content)
  } else if (typeof t.content === 'string') {
    content = t.content
  } else {
    return undefined
  }

  return finalizeEvent(
    {
      kind: ChannelHideMessage,
      tags: [['e', t.channel_message_event_id], ...(t.tags ?? [])],
      content: content,
      created_at: t.created_at,
    },
    privateKey,
  )
}

export const channelMuteUserEvent = (t: ChannelMuteUserEventTemplate, privateKey: Uint8Array): Event | undefined => {
  let content: string
  if (typeof t.content === 'object') {
    content = JSON.stringify(t.content)
  } else if (typeof t.content === 'string') {
    content = t.content
  } else {
    return undefined
  }

  return finalizeEvent(
    {
      kind: ChannelMuteUser,
      tags: [['p', t.pubkey_to_mute], ...(t.tags ?? [])],
      content: content,
      created_at: t.created_at,
    },
    privateKey,
  )
}
