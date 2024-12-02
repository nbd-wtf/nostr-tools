import { test, expect } from 'bun:test'
import { wrapEvent, wrapManyEvents, unwrapEvent, unwrapManyEvents } from './nip59.ts'
import { decode } from './nip19.ts'
import { NostrEvent, getPublicKey } from './pure.ts'
import { SimplePool } from './pool.ts'
import { GiftWrap } from './kinds.ts'
import { hexToBytes } from '@noble/hashes/utils'

const senderPrivateKey = decode(`nsec1p0ht6p3wepe47sjrgesyn4m50m6avk2waqudu9rl324cg2c4ufesyp6rdg`).data
const recipientPrivateKey = decode(`nsec1uyyrnx7cgfp40fcskcr2urqnzekc20fj0er6de0q8qvhx34ahazsvs9p36`).data
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
