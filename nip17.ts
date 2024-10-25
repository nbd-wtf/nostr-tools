import { PrivateDirectMessage } from './kinds.ts'
import { getPublicKey } from './pure'
import * as nip59 from './nip59'

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
  const event = createEvent(recipient, message, conversationTitle, replyTo)
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

  // Initialize the wrappeds array with the sender's own wrapped event
  const wrappeds = [wrapEvent(senderPrivateKey, { publicKey: senderPublicKey }, message, conversationTitle, replyTo)]

  // Wrap the event for each recipient
  recipients.forEach(recipient => {
    wrappeds.push(wrapEvent(senderPrivateKey, recipient, message, conversationTitle, replyTo))
  })

  return wrappeds
}

export const unwrapEvent = nip59.unwrapEvent

export const unwrapManyEvents = nip59.unwrapManyEvents
