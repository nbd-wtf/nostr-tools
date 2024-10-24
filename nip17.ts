import { PrivateDirectMessage, GiftWrap } from './kinds.ts'
import { getPublicKey } from './pure'
import { SimplePool } from './pool'
import * as nip59 from './nip59'

type Recipient = {
  publicKey: string
  relayUrl?: string
}

type ReplyTo = {
  eventId: string
  relayUrl?: string
}

type WrappedEvent = {
  kind: number
  content: string
  created_at: number
  tags: string[][]
  pubkey: string
  id: string
  sig: string
}

function createEvent(
  recipients: Recipient | Recipient[],
  message: string,
  conversationTitle?: string,
  replyTo?: ReplyTo,
) {
  const baseEvent = {
    kind: PrivateDirectMessage,
    tags: [] as (string | string[])[],
    content: message,
  }

  const recipientsArray = Array.isArray(recipients) ? recipients : [recipients]

  recipientsArray.forEach(({ publicKey, relayUrl }) => {
    baseEvent.tags.push(relayUrl ? ['p', publicKey, relayUrl] : ['p', publicKey])
  })

  if (replyTo) {
    baseEvent.tags.push(['e', replyTo.eventId, replyTo.relayUrl || '', 'reply'])
  }

  if (conversationTitle) {
    baseEvent.tags.push(['subject', conversationTitle])
  }

  return baseEvent
}

export function wrapEvent(
  senderPrivateKey: Uint8Array,
  recipient: Recipient,
  message: string,
  conversationTitle?: string,
  replyTo?: ReplyTo,
) {
  // Create the event using createEvent
  const event = createEvent(recipient, message, conversationTitle, replyTo)

  // Wrap the created event using nip59
  return nip59.wrapEvent(event, senderPrivateKey, recipient.publicKey)
}

export function wrapManyEvents(
  senderPrivateKey: Uint8Array,
  recipients: Recipient[],
  message: string,
  conversationTitle?: string,
  replyTo?: ReplyTo,
) {
  if (!recipients || recipients.length === 0) {
    throw new Error('At least one recipient is required.')
  }

  const senderPublicKey = getPublicKey(senderPrivateKey)

  // Initialize the wraps array with the sender's own wrapped event
  const wrappeds = [
    wrapEvent(senderPrivateKey, { publicKey: senderPublicKey }, message, conversationTitle, replyTo)
  ]

  // Wrap the event for each recipient
  recipients.forEach(recipient => {
    wrappeds.push(wrapEvent(senderPrivateKey, recipient, message, conversationTitle, replyTo))
  })

  return wrappeds
}

export function unwrapEvent(wrappedEvent: WrappedEvent, recipientPrivateKey: Uint8Array) {
  return nip59.unwrapEvent(wrappedEvent, recipientPrivateKey)
}

export function unwrapManyEvents(wrappedEvents: WrappedEvent[], recipientPrivateKey: Uint8Array) {
  let unwrappedEvents = []

  wrappedEvents.forEach(e => {
    unwrappedEvents.push(unwrapEvent(e, recipientPrivateKey))
  })

  unwrappedEvents.sort((a, b) => a.created_at - b.created_at)

  return unwrappedEvents
}

export async function getWrappedEvents(pubKey: string, relays: string[] = []): Promise<Event[] | undefined> {
  const pool = new SimplePool()

  try {
    const events: WrappedEvent[] = await pool.querySync(relays, { kinds: [GiftWrap], '#p': [pubKey] })
    pool.close(relays)

    return events
  } catch (error) {
    console.error('Failed to:', error)
    return undefined
  }
}
