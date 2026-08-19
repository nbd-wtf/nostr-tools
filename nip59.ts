import { EventTemplate, UnsignedEvent, NostrEvent } from './core.ts'
import { getConversationKey, decrypt, encrypt } from './nip44.ts'
import { getEventHash, generateSecretKey, finalizeEvent, getPublicKey, verifyEvent } from './pure.ts'
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
  if (wrap.kind !== GiftWrap) {
    throw new Error(`unexpected wrap kind ${wrap.kind}, expected ${GiftWrap}`)
  }

  const seal = nip44Decrypt(wrap, recipientPrivateKey) as NostrEvent

  // the seal is the only thing that proves authorship: the wrap is signed by a
  // throwaway key, and the rumor isn't signed at all. so the seal must be a real
  // signed event, and the rumor it carries must claim the seal's author -- otherwise
  // anyone could seal a rumor bearing someone else's pubkey and have it attributed
  // to them.
  if (seal.kind !== Seal) {
    throw new Error(`unexpected seal kind ${seal.kind}, expected ${Seal}`)
  }
  if (!verifyEvent(seal)) {
    throw new Error('seal signature is invalid')
  }

  const rumor = nip44Decrypt(seal, recipientPrivateKey) as Rumor
  if (rumor.pubkey !== seal.pubkey) {
    throw new Error(`rumor pubkey ${rumor.pubkey} does not match seal pubkey ${seal.pubkey}`)
  }

  return rumor
}

export function unwrapManyEvents(wrappedEvents: NostrEvent[], recipientPrivateKey: Uint8Array): Rumor[] {
  let unwrappedEvents: Rumor[] = []

  wrappedEvents.forEach(e => {
    try {
      unwrappedEvents.push(unwrapEvent(e, recipientPrivateKey))
    } catch (_err) {
      // wraps that can't be unwrapped or fail the checks above are skipped: anyone
      // can send us a gift wrap, so one bad event must not discard the whole batch
    }
  })

  unwrappedEvents.sort((a, b) => a.created_at - b.created_at)

  return unwrappedEvents
}
