import { EventTemplate, UnsignedEvent, Event } from './core.ts'
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

const nip44Decrypt = (data: Event, privateKey: Uint8Array) =>
  JSON.parse(decrypt(data.content, nip44ConversationKey(privateKey, data.pubkey)))

export function createRumor(event: Partial<UnsignedEvent>, privateKey: Uint8Array) {
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

export function createSeal(rumor: Rumor, privateKey: Uint8Array, recipientPublicKey: string) {
  return finalizeEvent(
    {
      kind: Seal,
      content: nip44Encrypt(rumor, privateKey, recipientPublicKey),
      created_at: randomNow(),
      tags: [],
    },
    privateKey,
  ) as Event
}

export function createWrap(seal: Event, recipientPublicKey: string) {
  const randomKey = generateSecretKey()

  return finalizeEvent(
    {
      kind: GiftWrap,
      content: nip44Encrypt(seal, randomKey, recipientPublicKey),
      created_at: randomNow(),
      tags: [['p', recipientPublicKey]],
    },
    randomKey,
  ) as Event
}

export function wrapEvent(event: Partial<UnsignedEvent>, senderPrivateKey: Uint8Array, recipientPublicKey: string) {
  const rumor = createRumor(event, senderPrivateKey)

  const seal = createSeal(rumor, senderPrivateKey, recipientPublicKey)
  return createWrap(seal, recipientPublicKey)
}

export function unwrapEvent(wrap: Event, recipientPrivateKey: Uint8Array) {
  const unwrappedSeal = nip44Decrypt(wrap, recipientPrivateKey)
  return nip44Decrypt(unwrappedSeal, recipientPrivateKey)
}
