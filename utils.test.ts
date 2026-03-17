import { describe, test, expect } from 'bun:test'
import { buildEvent } from './test-helpers.ts'
import {
  insertEventIntoAscendingList,
  insertEventIntoDescendingList,
  binarySearch,
  normalizeURL,
  mergeReverseSortedLists,
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

test('binary search', () => {
  expect(binarySearch(['a', 'b', 'd', 'e'], b => ('e' < b ? -1 : 'e' === b ? 0 : 1))).toEqual([3, true])
  expect(binarySearch(['a', 'b', 'd', 'e'], b => ('x' < b ? -1 : 'x' === b ? 0 : 1))).toEqual([4, false])
  expect(binarySearch(['a', 'b', 'd', 'e'], b => ('c' < b ? -1 : 'c' === b ? 0 : 1))).toEqual([2, false])
  expect(binarySearch(['a', 'b', 'd', 'e'], b => ('a' < b ? -1 : 'a' === b ? 0 : 1))).toEqual([0, true])
  expect(binarySearch(['a', 'b', 'd', 'e'], b => ('[' < b ? -1 : '[' === b ? 0 : 1))).toEqual([0, false])
})

describe('mergeReverseSortedLists', () => {
  test('merge empty lists', () => {
    const list1: Event[] = []
    const list2: Event[] = []
    expect(mergeReverseSortedLists(list1, list2)).toHaveLength(0)
  })

  test('merge list with empty list', () => {
    const list1 = [buildEvent({ id: 'a', created_at: 30 }), buildEvent({ id: 'b', created_at: 20 })]
    const list2: Event[] = []
    const result = mergeReverseSortedLists(list1, list2)
    expect(result).toHaveLength(2)
    expect(result.map(e => e.id)).toEqual(['a', 'b'])
  })

  test('merge two simple lists', () => {
    const list1 = [
      buildEvent({ id: 'a', created_at: 30 }),
      buildEvent({ id: 'b', created_at: 10 }),
      buildEvent({ id: 'f', created_at: 3 }),
      buildEvent({ id: 'g', created_at: 2 }),
    ]
    const list2 = [
      buildEvent({ id: 'c', created_at: 25 }),
      buildEvent({ id: 'd', created_at: 5 }),
      buildEvent({ id: 'e', created_at: 1 }),
    ]
    const result = mergeReverseSortedLists(list1, list2)
    expect(result.map(e => e.id)).toEqual(['a', 'c', 'b', 'd', 'f', 'g', 'e'])
  })

  test('merge lists with same timestamps', () => {
    const list1 = [
      buildEvent({ id: 'a', created_at: 30 }),
      buildEvent({ id: 'b', created_at: 20 }),
      buildEvent({ id: 'f', created_at: 10 }),
    ]
    const list2 = [
      buildEvent({ id: 'c', created_at: 30 }),
      buildEvent({ id: 'd', created_at: 20 }),
      buildEvent({ id: 'e', created_at: 20 }),
    ]
    const result = mergeReverseSortedLists(list1, list2)
    expect(result.map(e => e.id)).toEqual(['c', 'a', 'd', 'e', 'b', 'f'])
  })

  test('deduplicate events with same timestamp and id', () => {
    const list1 = [
      buildEvent({ id: 'a', created_at: 30 }),
      buildEvent({ id: 'b', created_at: 20 }),
      buildEvent({ id: 'b', created_at: 20 }),
      buildEvent({ id: 'c', created_at: 20 }),
      buildEvent({ id: 'd', created_at: 10 }),
    ]
    const list2 = [
      buildEvent({ id: 'a', created_at: 30 }),
      buildEvent({ id: 'c', created_at: 20 }),
      buildEvent({ id: 'b', created_at: 20 }),
      buildEvent({ id: 'd', created_at: 10 }),
      buildEvent({ id: 'e', created_at: 10 }),
      buildEvent({ id: 'd', created_at: 10 }),
    ]
    console.log('==================')
    const result = mergeReverseSortedLists(list1, list2)
    console.log(
      'result:',
      result.map(e => e.id),
    )
    expect(result.map(e => e.id)).toEqual(['a', 'c', 'b', 'd', 'e'])
  })

  test('merge when one list is completely before the other', () => {
    const list1 = [buildEvent({ id: 'a', created_at: 50 }), buildEvent({ id: 'b', created_at: 40 })]
    const list2 = [buildEvent({ id: 'c', created_at: 30 }), buildEvent({ id: 'd', created_at: 20 })]
    const result = mergeReverseSortedLists(list1, list2)
    expect(result).toHaveLength(4)
    expect(result.map(e => e.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  test('merge when one list is completely after the other', () => {
    const list1 = [buildEvent({ id: 'a', created_at: 10 }), buildEvent({ id: 'b', created_at: 5 })]
    const list2 = [buildEvent({ id: 'c', created_at: 30 }), buildEvent({ id: 'd', created_at: 20 })]
    const result = mergeReverseSortedLists(list1, list2)
    expect(result).toHaveLength(4)
    expect(result.map(e => e.id)).toEqual(['c', 'd', 'a', 'b'])
  })
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
