import { describe, it, expect } from 'bun:test'

import { sendNegentropyMessage, openNegentropyWithMessage, closeNegentropy } from './nip77.ts'
import type { Filter } from './filter.ts'
import { AbstractRelay } from './abstract-relay.ts'
import type { Event, VerifiedEvent } from './core.ts'

// A minimal mock relay implementing send(). We don't need websocket behavior here.
class MockRelay extends AbstractRelay {
  public sent: string[] = []
  constructor(url: string = 'wss://example.com') {
    // pass a dummy verifyEvent function to satisfy constructor (always returns true)
    const verifyEvent = (event: Event): event is VerifiedEvent => true
    super(url, { verifyEvent })
    // Pretend it's connected so send() doesn't throw.
    // @ts-ignore accessing private
    this.connectionPromise = Promise.resolve()
  }
  public override async send(message: string) {
    this.sent.push(message)
  }
}

function extractJSON(message: string) {
  return JSON.parse(message)
}

describe('nip77 negentropy message helpers', () => {
  it('sendNegentropyMessage should send NEG-MSG with generated subscription id and filters flattened', () => {
    const relay = new MockRelay()
    const filters: Filter[] = [{ kinds: [1], authors: ['abc'] }, { ids: ['deadbeef'] }]
    sendNegentropyMessage(relay as any, 'hello', filters)

    expect(relay.sent.length).toBe(1)
    const arr = extractJSON(relay.sent[0])
    expect(arr[0]).toBe('NEG-MSG')
    expect(typeof arr[1]).toBe('string') // auto sub id
    // message should include each filter object fields flattened after the sub id
    // Request format built in nip77.ts: ["NEG-MSG","subId",<filters without outer []>,"msg"]
    // So positions 2..n-2 are filter objects; last element is the msg string
    expect(arr[arr.length - 1]).toBe('hello')
    // Ensure at least one property from each filter is present
    const serialized = relay.sent[0]
    expect(serialized.includes('"kinds":[1]')).toBe(true)
    expect(serialized.includes('"authors":["abc"]')).toBe(true)
    expect(serialized.includes('"ids":["deadbeef"]')).toBe(true)
  })

  it('openNegentropyWithMessage should send NEG-OPEN', () => {
    const relay = new MockRelay()
    const filters: Filter[] = [{ kinds: [3] }]
    openNegentropyWithMessage(relay as any, 'init', filters, 'sub123')

    expect(relay.sent.length).toBe(1)
    const arr = extractJSON(relay.sent[0])
    expect(arr[0]).toBe('NEG-OPEN')
    expect(arr[1]).toBe('sub123')
    expect(arr[arr.length - 1]).toBe('init')
  })

  it('closeNegentropy should send NEG-CLOSE with given subscription id', () => {
    const relay = new MockRelay()
    closeNegentropy(relay as any, 'subXYZ')

    expect(relay.sent.length).toBe(1)
    const arr = extractJSON(relay.sent[0])
    expect(arr).toEqual(['NEG-CLOSE', 'subXYZ'])
  })

  it('sendNegentropyMessage should honor provided subscriptionId', () => {
    const relay = new MockRelay()
    const filters: Filter[] = [{ kinds: [1] }]
    sendNegentropyMessage(relay as any, 'custom', filters, 'customSub')
    const arr = extractJSON(relay.sent[0])
    expect(arr[1]).toBe('customSub')
  })

  it('should handle empty filters array (request still valid)', () => {
    const relay = new MockRelay()
    sendNegentropyMessage(relay as any, 'nofilters', [])
    const arr = extractJSON(relay.sent[0])
    expect(arr[0]).toBe('NEG-MSG')
    expect(typeof arr[1]).toBe('string')
    // With empty filters array we expect exactly 3 elements: type, subId, msg
    expect(arr.length).toBe(3)
    expect(arr[2]).toBe('nofilters')
  })
})
