import { test, expect } from 'bun:test'
import {
  wrapEvent,
  wrapManyEvents,
  unwrapEvent,
  unwrapManyEvents,
  createRumor,
  createSeal,
  createWrap,
} from './nip59.ts'
import { decode } from './nip19.ts'
import { NostrEvent, getEventHash, generateSecretKey, getPublicKey } from './pure.ts'
import { SimplePool } from './pool.ts'
import { GiftWrap } from './kinds.ts'
import { hexToBytes } from '@noble/hashes/utils.js'

const senderPrivateKey = decode(`nsec1p0ht6p3wepe47sjrgesyn4m50m6avk2waqudu9rl324cg2c4ufesyp6rdg`).data as Uint8Array
const recipientPrivateKey = decode(`nsec1uyyrnx7cgfp40fcskcr2urqnzekc20fj0er6de0q8qvhx34ahazsvs9p36`).data as Uint8Array
const recipientPublicKey = getPublicKey(recipientPrivateKey)
const event = {
  kind: 1,
  content: 'Are you going to the party tonight?',
}

const wrappedEvent = wrapEvent(event, senderPrivateKey, recipientPublicKey)

test('wrapEvent', () => {
  const expected = {
    content: '',
    id: '',
    created_at: 1728537932,
    kind: 1059,
    pubkey: '',
    sig: '',
    tags: [['p', '166bf3765ebd1fc55decfe395beff2ea3b2a4e0a8946e7eb578512b555737c99']],
    [Symbol('verified')]: true,
  }
  const result = wrapEvent(event, senderPrivateKey, recipientPublicKey)

  expect(result.kind).toEqual(expected.kind)
  expect(result.tags).toEqual(expected.tags)
})

test('wrapManyEvent', () => {
  const expected = [
    {
      kind: 1059,
      content: '',
      created_at: 1729581521,
      tags: [['p', '611df01bfcf85c26ae65453b772d8f1dfd25c264621c0277e1fc1518686faef9']],
      pubkey: '',
      id: '',
      sig: '',
      [Symbol('verified')]: true,
    },
    {
      kind: 1059,
      content: '',
      created_at: 1729594619,
      tags: [['p', '166bf3765ebd1fc55decfe395beff2ea3b2a4e0a8946e7eb578512b555737c99']],
      pubkey: '',
      id: '',
      sig: '',
      [Symbol('verified')]: true,
    },
  ]

  const wrappedEvents = wrapManyEvents(event, senderPrivateKey, [recipientPublicKey])

  wrappedEvents.forEach((event, index) => {
    expect(event.kind).toEqual(expected[index].kind)
    expect(event.tags).toEqual(expected[index].tags)
  })
})

test('unwrapEvent', () => {
  const expected = {
    kind: 1,
    content: 'Are you going to the party tonight?',
    pubkey: '611df01bfcf85c26ae65453b772d8f1dfd25c264621c0277e1fc1518686faef9',
    tags: [],
  }
  const result = unwrapEvent(wrappedEvent, recipientPrivateKey)

  expect(result.kind).toEqual(expected.kind)
  expect(result.content).toEqual(expected.content)
  expect(result.pubkey).toEqual(expected.pubkey)
  expect(result.tags).toEqual(expected.tags)
})

function forgeWrap(impersonatedPublicKey: string): NostrEvent {
  // an attacker seals a rumor that names someone else as its author. the seal is
  // signed by the attacker and encrypted to the recipient, so it decrypts fine.
  const forgedRumor = {
    created_at: Math.round(Date.now() / 1000),
    kind: 14,
    tags: [],
    content: 'trust me, I really am the sender',
    pubkey: impersonatedPublicKey,
  } as any
  forgedRumor.id = getEventHash(forgedRumor)

  return createWrap(createSeal(forgedRumor, generateSecretKey(), recipientPublicKey), recipientPublicKey)
}

test('unwrapEvent rejects a rumor whose pubkey does not match the seal', () => {
  const wrap = forgeWrap(getPublicKey(senderPrivateKey))

  expect(() => unwrapEvent(wrap, recipientPrivateKey)).toThrow(/does not match seal pubkey/)
})

test('unwrapEvent rejects a seal with an invalid signature', () => {
  const rumor = createRumor(event, senderPrivateKey)
  const seal = createSeal(rumor, senderPrivateKey, recipientPublicKey)
  const wrap = createWrap({ ...seal, created_at: seal.created_at + 1 }, recipientPublicKey)

  expect(() => unwrapEvent(wrap, recipientPrivateKey)).toThrow(/seal signature is invalid/)
})

test('unwrapEvent rejects a wrap of the wrong kind', () => {
  expect(() => unwrapEvent({ ...wrappedEvent, kind: 1 }, recipientPrivateKey)).toThrow(/unexpected wrap kind/)
})

test('unwrapManyEvents skips wraps that fail to unwrap', () => {
  const results = unwrapManyEvents([forgeWrap(getPublicKey(senderPrivateKey)), wrappedEvent], recipientPrivateKey)

  expect(results.length).toEqual(1)
  expect(results[0].pubkey).toEqual(getPublicKey(senderPrivateKey))
})

test('getWrappedEvents and unwrapManyEvents', async () => {
  const expected = [
    {
      created_at: 1729721879,
      content: 'Hello!',
      tags: [['p', '33d6bb037bf2e8c4571708e480e42d141bedc5a562b4884ec233b22d6fdea6aa']],
      kind: 14,
      pubkey: 'c0f56665e73eedc90b9565ecb34d961a2eb7ac1e2747899e4f73a813f940bc22',
      id: 'aee0a3e6487b2ac8c1851cc84f3ae0fca9af8a9bdad85c4ba5fdf45d3ee817c3',
    },
    {
      created_at: 1729722025,
      content: 'How are you?',
      tags: [['p', '33d6bb037bf2e8c4571708e480e42d141bedc5a562b4884ec233b22d6fdea6aa']],
      kind: 14,
      pubkey: 'c0f56665e73eedc90b9565ecb34d961a2eb7ac1e2747899e4f73a813f940bc22',
      id: '212387ec5efee7d6eb20b747121e9fc1adb798de6c3185e932335bb1bcc61a77',
    },
  ]
  const relays = ['wss://relay.damus.io', 'wss://nos.lol']
  const privateKey = hexToBytes('582c3e7902c10c84d1cfe899a102e56bde628972d58d63011163ce0cdf4279b6')
  const publicKey = '33d6bb037bf2e8c4571708e480e42d141bedc5a562b4884ec233b22d6fdea6aa'

  const pool = new SimplePool()
  const wrappedEvents: NostrEvent[] = await pool.querySync(relays, { kinds: [GiftWrap], '#p': [publicKey] })
  const unwrappedEvents = unwrapManyEvents(wrappedEvents, privateKey)

  unwrappedEvents.forEach((event, index) => {
    expect(event).toEqual(expected[index])
  })
})
