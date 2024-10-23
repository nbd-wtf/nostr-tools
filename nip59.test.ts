import { test, expect } from 'bun:test'
import { wrapEvent, unwrapEvent } from './nip59.ts'
import { decode } from './nip19.ts'
import { getPublicKey } from './pure.ts'

const senderPrivateKey = decode(`nsec1p0ht6p3wepe47sjrgesyn4m50m6avk2waqudu9rl324cg2c4ufesyp6rdg`).data
const recipientPrivateKey = decode(`nsec1uyyrnx7cgfp40fcskcr2urqnzekc20fj0er6de0q8qvhx34ahazsvs9p36`).data
const recipientPublicKey = getPublicKey(recipientPrivateKey)
const event = {
  kind: 1,
  content: 'Are you going to the party tonight?',
}

const wrapedEvent = wrapEvent(event, senderPrivateKey, recipientPublicKey)

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

test('unwrapEvent', () => {
  const expected = {
    kind: 1,
    content: 'Are you going to the party tonight?',
    pubkey: '611df01bfcf85c26ae65453b772d8f1dfd25c264621c0277e1fc1518686faef9',
    tags: [],
  }
  const result = unwrapEvent(wrapedEvent, recipientPrivateKey)

  expect(result.kind).toEqual(expected.kind)
  expect(result.content).toEqual(expected.content)
  expect(result.pubkey).toEqual(expected.pubkey)
  expect(result.tags).toEqual(expected.tags)
})
