import { test, expect } from 'bun:test'
import { getPublicKey } from './pure.ts'
import { decode } from './nip19.ts'
import { wrapEvent, wrapManyEvents, unwrapEvent } from './nip17.ts'
import { hexToBytes } from '@noble/hashes/utils'

const senderPrivateKey = decode(`nsec1p0ht6p3wepe47sjrgesyn4m50m6avk2waqudu9rl324cg2c4ufesyp6rdg`).data

const sk1 = hexToBytes('f09ac9b695d0a4c6daa418fe95b977eea20f54d9545592bc36a4f9e14f3eb840')
const sk2 = hexToBytes('5393a825e5892d8e18d4a5ea61ced105e8bb2a106f42876be3a40522e0b13747')

const recipients = [
  { publicKey: getPublicKey(sk1), relayUrl: 'wss://relay1.com' },
  { publicKey: getPublicKey(sk2) }, // No relay URL for this recipient
]
const message = 'Hello, this is a direct message!'
const conversationTitle = 'Private Group Conversation' // Optional
const replyTo = { eventId: 'previousEventId123' } // Optional, for replies

const wrappedEvent = wrapEvent(senderPrivateKey, recipients[0], message, conversationTitle, replyTo)

test('wrapEvent', () => {
  const expected = {
    content: '',
    id: '',
    created_at: 1728537932,
    kind: 1059,
    pubkey: '',
    sig: '',
    tags: [['p', 'b60849e5aae4113b236f9deb34f6f85605b4c53930651309a0d60c7ea721aad0']],
    [Symbol('verified')]: true,
  }

  expect(wrappedEvent.kind).toEqual(expected.kind)
  expect(wrappedEvent.tags).toEqual(expected.tags)
})

test('wrapManyEvents', () => {
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
      tags: [['p', 'b60849e5aae4113b236f9deb34f6f85605b4c53930651309a0d60c7ea721aad0']],
      pubkey: '',
      id: '',
      sig: '',
      [Symbol('verified')]: true,
    },
    {
      kind: 1059,
      content: '',
      created_at: 1729560014,
      tags: [['p', '36f7288c84d85ca6aa189dc3581d63ce140b7eeef5ae759421c5b5a3627312db']],
      pubkey: '',
      id: '',
      sig: '',
      [Symbol('verified')]: true,
    },
  ]

  const wrappedEvents = wrapManyEvents(senderPrivateKey, recipients, message, conversationTitle, replyTo)

  wrappedEvents.forEach((event, index) => {
    expect(event.kind).toEqual(expected[index].kind)
    expect(event.tags).toEqual(expected[index].tags)
  })
})

test('unwrapEvent', () => {
  const expected = {
    kind: 14,
    content: 'Hello, this is a direct message!',
    pubkey: '611df01bfcf85c26ae65453b772d8f1dfd25c264621c0277e1fc1518686faef9',
    tags: [
      ['p', 'b60849e5aae4113b236f9deb34f6f85605b4c53930651309a0d60c7ea721aad0', 'wss://relay1.com'],
      ['e', 'previousEventId123', '', 'reply'],
      ['subject', 'Private Group Conversation'],
    ],
  }
  const result = unwrapEvent(wrappedEvent, sk1)

  expect(result.kind).toEqual(expected.kind)
  expect(result.content).toEqual(expected.content)
  expect(result.pubkey).toEqual(expected.pubkey)
  expect(result.tags).toEqual(expected.tags)
})
