import { EventTemplate, UnsignedEvent, NostrEvent } from './core.ts'
import { getConversationKey, decrypt, encrypt } from './nip44.ts'
import { getEventHash, generateSecretKey, finalizeEvent, getPublicKey } from './pure.ts'
import { Seal, GiftWrap } from './kinds.ts'

type Rumor = UnsignedEvent & { id: string }

const TWO_DAYS = 2 * 24 * 60 * 60

const now = () => Math.round(Date.now() / 1000)
const randomNow = () => Math.round(now() - Math.random() * TWO_DAYS)

const nip44ConversationKey = (privateKey: Uint8Array, publicKey: string) => getConversationKey(privateKey, publicKey)

const nip44Encrypt = (data: EventTemplate, privateKey: Uint8Array, publicKey: string) =>
  encrypt(JSON.stringify(data), nip44ConversationKey(privateKey, publicKey))

const nip44Decrypt = (data: NostrEvent, privateKey: Uint8Array) =>
  JSON.parse(decrypt(data.content, nip44ConversationKey(privateKey, data.pubkey)))

export function createRumor(event: Partial<UnsignedEvent>, privateKey: Uint8Array): Rumor {
  const rumor = {
    created_at: now(),
    content: '',
    tags: [],
    ...event,
    pubkey: getPublicKey(privateKey),
  } as any

  rumor.id = getEventHash(rumor)

  return rumor as Rumor
}

export function createSeal(rumor: Rumor, privateKey: Uint8Array, recipientPublicKey: string): NostrEvent {
  return finalizeEvent(
    {
      kind: Seal,
      content: nip44Encrypt(rumor, privateKey, recipientPublicKey),
      created_at: randomNow(),
      tags: [],
    },
    privateKey,
  )
}

export function createWrap(seal: NostrEvent, recipientPublicKey: string): NostrEvent {
  const randomKey = generateSecretKey()

  return finalizeEvent(
    {
      kind: GiftWrap,
      content: nip44Encrypt(seal, randomKey, recipientPublicKey),
      created_at: randomNow(),
      tags: [['p', recipientPublicKey]],
    },
    randomKey,
  ) as NostrEvent
}

export function wrapEvent(
  event: Partial<UnsignedEvent>,
  senderPrivateKey: Uint8Array,
  recipientPublicKey: string,
): NostrEvent {
  const rumor = createRumor(event, senderPrivateKey)

  const seal = createSeal(rumor, senderPrivateKey, recipientPublicKey)
  return createWrap(seal, recipientPublicKey)
}

export function wrapManyEvents(
  event: Partial<UnsignedEvent>,
  senderPrivateKey: Uint8Array,
  recipientsPublicKeys: string[],
): NostrEvent[] {
  if (!recipientsPublicKeys || recipientsPublicKeys.length === 0) {
    throw new Error('At least one recipient is required.')
  }

  const senderPublicKey = getPublicKey(senderPrivateKey)

  const wrappeds = [wrapEvent(event, senderPrivateKey, senderPublicKey)]

  recipientsPublicKeys.forEach(recipientPublicKey => {
    wrappeds.push(wrapEvent(event, senderPrivateKey, recipientPublicKey))
  })

  return wrappeds
}

export function unwrapEvent(wrap: NostrEvent, recipientPrivateKey: Uint8Array): Rumor {
  const unwrappedSeal = nip44Decrypt(wrap, recipientPrivateKey)
  return nip44Decrypt(unwrappedSeal, recipientPrivateKey)
}

export function unwrapManyEvents(wrappedEvents: NostrEvent[], recipientPrivateKey: Uint8Array): Rumor[] {
  let unwrappedEvents: Rumor[] = []

  wrappedEvents.forEach(e => {
    unwrappedEvents.push(unwrapEvent(e, recipientPrivateKey))
  })

  unwrappedEvents.sort((a, b) => a.created_at - b.created_at)

  return unwrappedEvents
}
