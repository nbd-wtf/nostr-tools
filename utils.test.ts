import { describe, test, expect } from 'bun:test'
import { buildEvent } from './test-helpers.ts'
import {
  Queue,
  insertEventIntoAscendingList,
  insertEventIntoDescendingList,
  binarySearch,
  normalizeURL,
} from './utils.ts'

import type { Event } from './core.ts'

describe('inserting into a desc sorted list of events', () => {
  test('insert into an empty list', async () => {
    const list0: Event[] = []
    expect(insertEventIntoDescendingList(list0, buildEvent({ id: 'abc', created_at: 10 }))).toHaveLength(1)
  })

  test('insert in the beginning of a list', async () => {
    const list0 = [buildEvent({ created_at: 20 }), buildEvent({ created_at: 10 })]
    const list1 = insertEventIntoDescendingList(
      list0,
      buildEvent({
        id: 'abc',
        created_at: 30,
      }),
    )
    expect(list1).toHaveLength(3)
    expect(list1[0].id).toBe('abc')
  })

  test('insert in the beginning of a list with same created_at', async () => {
    const list0 = [buildEvent({ created_at: 30 }), buildEvent({ created_at: 20 }), buildEvent({ created_at: 10 })]
    const list1 = insertEventIntoDescendingList(
      list0,
      buildEvent({
        id: 'abc',
        created_at: 30,
      }),
    )
    expect(list1).toHaveLength(4)
    expect(list1[0].id).toBe('abc')
  })

  test('insert in the middle of a list', async () => {
    const list0 = [
      buildEvent({ created_at: 30 }),
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 10 }),
      buildEvent({ created_at: 1 }),
    ]
    const list1 = insertEventIntoDescendingList(
      list0,
      buildEvent({
        id: 'abc',
        created_at: 15,
      }),
    )
    expect(list1).toHaveLength(5)
    expect(list1[2].id).toBe('abc')
  })

  test('insert in the end of a list', async () => {
    const list0 = [
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 10 }),
    ]
    const list1 = insertEventIntoDescendingList(
      list0,
      buildEvent({
        id: 'abc',
        created_at: 5,
      }),
    )
    expect(list1).toHaveLength(6)
    expect(list1.slice(-1)[0].id).toBe('abc')
  })

  test('insert in the last-to-end of a list with same created_at', async () => {
    const list0: Event[] = [
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 10 }),
    ]
    const list1 = insertEventIntoDescendingList(
      list0,
      buildEvent({
        id: 'abc',
        created_at: 10,
      }),
    )
    expect(list1).toHaveLength(6)
    expect(list1.slice(-2)[0].id).toBe('abc')
  })

  test('do not insert duplicates', async () => {
    const list0 = [
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 10, id: 'abc' }),
    ]
    const list1 = insertEventIntoDescendingList(
      list0,
      buildEvent({
        id: 'abc',
        created_at: 10,
      }),
    )
    expect(list1).toHaveLength(3)
  })
})

describe('inserting into a asc sorted list of events', () => {
  test('insert into an empty list', async () => {
    const list0: Event[] = []
    expect(insertEventIntoAscendingList(list0, buildEvent({ id: 'abc', created_at: 10 }))).toHaveLength(1)
  })

  test('insert in the beginning of a list', async () => {
    const list0 = [buildEvent({ created_at: 10 }), buildEvent({ created_at: 20 })]
    const list1 = insertEventIntoAscendingList(
      list0,
      buildEvent({
        id: 'abc',
        created_at: 1,
      }),
    )
    expect(list1).toHaveLength(3)
    expect(list1[0].id).toBe('abc')
  })

  test('insert in the beginning of a list with same created_at', async () => {
    const list0 = [buildEvent({ created_at: 10 }), buildEvent({ created_at: 20 }), buildEvent({ created_at: 30 })]
    const list1 = insertEventIntoAscendingList(
      list0,
      buildEvent({
        id: 'abc',
        created_at: 10,
      }),
    )
    expect(list1).toHaveLength(4)
    expect(list1[0].id).toBe('abc')
  })

  test('insert in the middle of a list', async () => {
    const list0 = [
      buildEvent({ created_at: 10 }),
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 30 }),
      buildEvent({ created_at: 40 }),
    ]
    const list1 = insertEventIntoAscendingList(
      list0,
      buildEvent({
        id: 'abc',
        created_at: 25,
      }),
    )
    expect(list1).toHaveLength(5)
    expect(list1[2].id).toBe('abc')
  })

  test('insert in the end of a list', async () => {
    const list0 = [
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 40 }),
    ]
    const list1 = insertEventIntoAscendingList(
      list0,
      buildEvent({
        id: 'abc',
        created_at: 50,
      }),
    )
    expect(list1).toHaveLength(6)
    expect(list1.slice(-1)[0].id).toBe('abc')
  })

  test('insert in the last-to-end of a list with same created_at', async () => {
    const list0 = [
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 30 }),
    ]
    const list1 = insertEventIntoAscendingList(
      list0,
      buildEvent({
        id: 'abc',
        created_at: 30,
      }),
    )
    expect(list1).toHaveLength(6)
    expect(list1.slice(-2)[0].id).toBe('abc')
  })

  test('do not insert duplicates', async () => {
    const list0 = [
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 20 }),
      buildEvent({ created_at: 30, id: 'abc' }),
    ]
    const list1 = insertEventIntoAscendingList(
      list0,
      buildEvent({
        id: 'abc',
        created_at: 30,
      }),
    )
    expect(list1).toHaveLength(3)
  })
})

describe('enqueue a message into MessageQueue', () => {
  test('enqueue into an empty queue', () => {
    const queue = new Queue()
    queue.enqueue('node1')
    expect(queue.first!.value).toBe('node1')
  })
  test('enqueue into a non-empty queue', () => {
    const queue = new Queue()
    queue.enqueue('node1')
    queue.enqueue('node3')
    queue.enqueue('node2')
    expect(queue.first!.value).toBe('node1')
    expect(queue.last!.value).toBe('node2')
  })
  test('dequeue from an empty queue', () => {
    const queue = new Queue()
    const item1 = queue.dequeue()
    expect(item1).toBe(null)
  })
  test('dequeue from a non-empty queue', () => {
    const queue = new Queue()
    queue.enqueue('node1')
    queue.enqueue('node3')
    queue.enqueue('node2')
    const item1 = queue.dequeue()
    expect(item1).toBe('node1')
    const item2 = queue.dequeue()
    expect(item2).toBe('node3')
  })
  test('dequeue more than in queue', () => {
    const queue = new Queue()
    queue.enqueue('node1')
    queue.enqueue('node3')
    const item1 = queue.dequeue()
    expect(item1).toBe('node1')
    const item2 = queue.dequeue()
    expect(item2).toBe('node3')
    const item3 = queue.dequeue()
    expect(item3).toBe(null)
  })
})

test('binary search', () => {
  expect(binarySearch(['a', 'b', 'd', 'e'], b => ('e' < b ? -1 : 'e' === b ? 0 : 1))).toEqual([3, true])
  expect(binarySearch(['a', 'b', 'd', 'e'], b => ('x' < b ? -1 : 'x' === b ? 0 : 1))).toEqual([4, false])
  expect(binarySearch(['a', 'b', 'd', 'e'], b => ('c' < b ? -1 : 'c' === b ? 0 : 1))).toEqual([2, false])
  expect(binarySearch(['a', 'b', 'd', 'e'], b => ('a' < b ? -1 : 'a' === b ? 0 : 1))).toEqual([0, true])
  expect(binarySearch(['a', 'b', 'd', 'e'], b => ('[' < b ? -1 : '[' === b ? 0 : 1))).toEqual([0, false])
})

describe('normalizeURL', () => {
  test('normalizes wss:// URLs', () => {
    expect(normalizeURL('wss://example.com')).toBe('wss://example.com/')
    expect(normalizeURL('wss://example.com/')).toBe('wss://example.com/')
    expect(normalizeURL('wss://example.com//path')).toBe('wss://example.com/path')
    expect(normalizeURL('wss://example.com:443')).toBe('wss://example.com/')
  })

  test('normalizes https:// URLs', () => {
    expect(normalizeURL('https://example.com')).toBe('wss://example.com/')
    expect(normalizeURL('https://example.com/')).toBe('wss://example.com/')
    expect(normalizeURL('http://example.com//path')).toBe('ws://example.com/path')
  })

  test('normalizes ws:// URLs', () => {
    expect(normalizeURL('ws://example.com')).toBe('ws://example.com/')
    expect(normalizeURL('ws://example.com/')).toBe('ws://example.com/')
    expect(normalizeURL('ws://example.com//path')).toBe('ws://example.com/path')
    expect(normalizeURL('ws://example.com:80')).toBe('ws://example.com/')
  })

  test('adds wss:// to URLs without scheme', () => {
    expect(normalizeURL('example.com')).toBe('wss://example.com/')
    expect(normalizeURL('example.com/')).toBe('wss://example.com/')
    expect(normalizeURL('example.com//path')).toBe('wss://example.com/path')
  })

  test('handles query parameters', () => {
    expect(normalizeURL('wss://example.com?z=1&a=2')).toBe('wss://example.com/?a=2&z=1')
  })

  test('removes hash', () => {
    expect(normalizeURL('wss://example.com#hash')).toBe('wss://example.com/')
  })

  test('throws on invalid URL', () => {
    expect(() => normalizeURL('http://')).toThrow('Invalid URL: http://')
  })
})
