import { PrivateDirectMessage } from './kinds.ts'
import { EventTemplate, NostrEvent, getPublicKey } from './pure.ts'
import * as nip59 from './nip59.ts'

type Recipient = {
  publicKey: string
  relayUrl?: string
}

type ReplyTo = {
  eventId: string
  relayUrl?: string
}

function createEvent(
  recipients: Recipient | Recipient[],
  message: string,
  conversationTitle?: string,
  replyTo?: ReplyTo,
  createdAt?: number,
): EventTemplate {
  const baseEvent: EventTemplate = {
    created_at: createdAt ?? Math.ceil(Date.now() / 1000),
    kind: PrivateDirectMessage,
    tags: [],
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

/**
 * Builds and gift-wraps a kind-14 private direct message.
 *
 * Pass `createdAt` to reuse the rumor timestamp across retries. Since the rumor
 * id is derived from it, a retry with the same arguments produces the same id
 * and can be deduplicated by receivers. For full control over an existing rumor,
 * use `nip59.createRumor`, `nip59.createSeal` and `nip59.createWrap`.
 */
export function wrapEvent(
  senderPrivateKey: Uint8Array,
  recipient: Recipient,
  message: string,
  conversationTitle?: string,
  replyTo?: ReplyTo,
  createdAt?: number,
): NostrEvent {
  const event = createEvent(recipient, message, conversationTitle, replyTo, createdAt)
  return nip59.wrapEvent(event, senderPrivateKey, recipient.publicKey)
}

/**
 * Builds and gift-wraps a kind-14 private direct message for the sender and
 * every recipient. All copies share the same rumor `created_at`, so passing
 * `createdAt` also makes retries reproduce the same ids.
 */
export function wrapManyEvents(
  senderPrivateKey: Uint8Array,
  recipients: Recipient[],
  message: string,
  conversationTitle?: string,
  replyTo?: ReplyTo,
  createdAt?: number,
): NostrEvent[] {
  if (!recipients || recipients.length === 0) {
    throw new Error('At least one recipient is required.')
  }

  const senderPublicKey = getPublicKey(senderPrivateKey)
  const rumorCreatedAt = createdAt ?? Math.ceil(Date.now() / 1000)

  // wrap the event for the sender and then for each recipient
  return [{ publicKey: senderPublicKey }, ...recipients].map(recipient =>
    wrapEvent(senderPrivateKey, recipient, message, conversationTitle, replyTo, rumorCreatedAt),
  )
}

export const unwrapEvent = nip59.unwrapEvent

export const unwrapManyEvents = nip59.unwrapManyEvents
