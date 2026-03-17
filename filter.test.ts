import { describe, test, expect } from 'bun:test'
import { getFilterLimit, matchFilter, matchFilters, mergeFilters } from './filter.ts'
import { buildEvent } from './test-helpers.ts'

describe('Filter', () => {
  describe('matchFilter', () => {
    test('should return true when all filter conditions are met', () => {
      const filter = {
        ids: ['123', '456'],
        kinds: [1, 2, 3],
        authors: ['abc'],
        since: 100,
        until: 200,
        '#tag': ['value'],
      }
      const event = buildEvent({
        id: '123',
        kind: 1,
        pubkey: 'abc',
        created_at: 150,
        tags: [['tag', 'value']],
      })
      const result = matchFilter(filter, event)
      expect(result).toEqual(true)
    })

    test('should return false when the event id is not in the filter', () => {
      const filter = { ids: ['123', '456'] }
      const event = buildEvent({ id: '789' })
      const result = matchFilter(filter, event)
      expect(result).toEqual(false)
    })

    test('should return false when the event kind is not in the filter', () => {
      const filter = { kinds: [1, 2, 3] }
      const event = buildEvent({ kind: 4 })
      const result = matchFilter(filter, event)
      expect(result).toEqual(false)
    })

    test('should return false when the event author is not in the filter', () => {
      const filter = { authors: ['abc', 'def'] }

      const event = buildEvent({ pubkey: 'ghi' })

      const result = matchFilter(filter, event)

      expect(result).toEqual(false)
    })

    test('should return false when a tag is not present in the event', () => {
      const filter = { '#tag': ['value1', 'value2'] }

      const event = buildEvent({ tags: [['not_tag', 'value1']] })

      const result = matchFilter(filter, event)

      expect(result).toEqual(false)
    })

    test('should return false when a tag value is not present in the event', () => {
      const filter = { '#tag': ['value1', 'value2'] }

      const event = buildEvent({ tags: [['tag', 'value3']] })

      const result = matchFilter(filter, event)

      expect(result).toEqual(false)
    })

    test('should return true when filter has tags that is present in the event', () => {
      const filter = { '#tag1': ['foo'] }

      const event = buildEvent({
        id: '123',
        kind: 1,
        pubkey: 'abc',
        created_at: 150,
        tags: [
          ['tag1', 'foo'],
          ['tag2', 'bar'],
        ],
      })

      const result = matchFilter(filter, event)

      expect(result).toEqual(true)
    })

    test('should return false when the event is before the filter since value', () => {
      const filter = { since: 100 }

      const event = buildEvent({ created_at: 50 })

      const result = matchFilter(filter, event)

      expect(result).toEqual(false)
    })

    test('should return true when the timestamp of event is equal to the filter since value', () => {
      const filter = { since: 100 }

      const event = buildEvent({ created_at: 100 })

      const result = matchFilter(filter, event)

      expect(result).toEqual(true)
    })

    test('should return false when the event is after the filter until value', () => {
      const filter = { until: 100 }

      const event = buildEvent({ created_at: 150 })

      const result = matchFilter(filter, event)

      expect(result).toEqual(false)
    })

    test('should return true when the timestamp of event is equal to the filter until value', () => {
      const filter = { until: 100 }

      const event = buildEvent({ created_at: 100 })

      const result = matchFilter(filter, event)

      expect(result).toEqual(true)
    })
  })

  describe('matchFilters', () => {
    test('should return true when at least one filter matches the event', () => {
      const filters = [
        { ids: ['123'], kinds: [1], authors: ['abc'] },
        { ids: ['456'], kinds: [2], authors: ['def'] },
        { ids: ['789'], kinds: [3], authors: ['ghi'] },
      ]
      const event = buildEvent({ id: '789', kind: 3, pubkey: 'ghi' })
      const result = matchFilters(filters, event)
      expect(result).toEqual(true)
    })

    test('should return true when event matches one or more filters and some have limit set', () => {
      const filters = [
        { ids: ['123'], limit: 1 },
        { kinds: [1], limit: 2 },
        { authors: ['abc'], limit: 3 },
      ]

      const event = buildEvent({
        id: '123',
        kind: 1,
        pubkey: 'abc',
        created_at: 150,
      })

      const result = matchFilters(filters, event)

      expect(result).toEqual(true)
    })

    test('should return false when no filters match the event', () => {
      const filters = [
        { ids: ['123'], kinds: [1], authors: ['abc'] },
        { ids: ['456'], kinds: [2], authors: ['def'] },
        { ids: ['789'], kinds: [3], authors: ['ghi'] },
      ]
      const event = buildEvent({ id: '100', kind: 4, pubkey: 'jkl' })
      const result = matchFilters(filters, event)
      expect(result).toEqual(false)
    })

    test('should return false when event matches none of the filters and some have limit set', () => {
      const filters = [
        { ids: ['123'], limit: 1 },
        { kinds: [1], limit: 2 },
        { authors: ['abc'], limit: 3 },
      ]
      const event = buildEvent({
        id: '456',
        kind: 2,
        pubkey: 'def',
        created_at: 200,
      })
      const result = matchFilters(filters, event)
      expect(result).toEqual(false)
    })
  })

  describe('mergeFilters', () => {
    test('should merge filters', () => {
      expect(mergeFilters({ ids: ['a', 'b'], limit: 3 }, { authors: ['x'], ids: ['b', 'c'] })).toEqual({
        ids: ['a', 'b', 'c'],
        limit: 3,
        authors: ['x'],
      })

      expect(
        mergeFilters({ kinds: [1], since: 15, until: 30 }, { since: 10, kinds: [7], until: 15 }, { kinds: [9, 10] }),
      ).toEqual({ kinds: [1, 7, 9, 10], since: 10, until: 30 })
    })
  })

  describe('getFilterLimit', () => {
    test('should handle ids', () => {
      expect(getFilterLimit({ ids: ['123'] })).toEqual(1)
      expect(getFilterLimit({ ids: ['123'], limit: 2 })).toEqual(1)
      expect(getFilterLimit({ ids: ['123'], limit: 0 })).toEqual(0)
      expect(getFilterLimit({ ids: ['123'], limit: -1 })).toEqual(0)
    })

    test('should count the authors times replaceable kinds', () => {
      expect(getFilterLimit({ kinds: [0], authors: ['alex'] })).toEqual(1)
      expect(getFilterLimit({ kinds: [0, 3], authors: ['alex'] })).toEqual(2)
      expect(getFilterLimit({ kinds: [0, 3], authors: ['alex', 'fiatjaf'] })).toEqual(4)
    })

    test('should handle parameterized replaceable events', () => {
      expect(getFilterLimit({ kinds: [30078], authors: ['alex'] })).toEqual(Infinity)
      expect(getFilterLimit({ kinds: [30078], authors: ['alex'], '#d': ['ditto'] })).toEqual(1)
      expect(getFilterLimit({ kinds: [30078], authors: ['alex'], '#d': ['ditto', 'soapbox'] })).toEqual(2)
      expect(getFilterLimit({ kinds: [30078], authors: ['alex', 'fiatjaf'], '#d': ['ditto', 'soapbox'] })).toEqual(4)
      expect(
        getFilterLimit({ kinds: [30000, 30078], authors: ['alex', 'fiatjaf'], '#d': ['ditto', 'soapbox'] }),
      ).toEqual(8)
    })

    test('should return Infinity for authors with regular kinds', () => {
      expect(getFilterLimit({ kinds: [1], authors: ['alex'] })).toEqual(Infinity)
    })

    test('should return Infinity for empty filters', () => {
      expect(getFilterLimit({})).toEqual(Infinity)
    })

    test('empty tags return 0', () => {
      expect(getFilterLimit({ '#p': [] })).toEqual(0)
    })
  })
})
