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
  recipients: Recipient,
  message: string,
  conversationTitle?: string,
  replyTo?: ReplyTo,
) {
  // Create the event using createEvent
  const event = createEvent(recipients, message, conversationTitle, replyTo)

  // Assuming recipients is an array or single recipient, extract the first recipient's public key
  const recipientPublicKey = Array.isArray(recipients) ? recipients[0].publicKey : recipients.publicKey

  // Wrap the created event using nip59
  return nip59.wrapEvent(event, senderPrivateKey, recipientPublicKey)
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
  const wraps = [
    wrapEvent(senderPrivateKey, { publicKey: senderPublicKey }, message, conversationTitle, replyTo), // sender's wrapped event
  ]

  // Wrap the event for each recipient
  recipients.forEach(recipient => {
    wraps.push(wrapEvent(senderPrivateKey, recipient, message, conversationTitle, replyTo))
  })

  return wraps
}

export function unwrapEvent(wrappedEvent: WrappedEvent, recipientPrivateKey: string | Uint8Array) {
  return nip59.unwrapEvent(wrappedEvent, recipientPrivateKey)
}

export function unwrapManyEvents(wrappedEvents: WrappedEvent[], recipientPrivateKey: string | Uint8Array) {
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
