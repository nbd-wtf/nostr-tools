import {matchFilter, matchFilters} from './filter.ts'
import {buildEvent} from './test-helpers.ts'

describe('Filter', () => {
  describe('matchFilter', () => {
    it('should return true when all filter conditions are met', () => {
      const filter = {
        ids: ['123', '456'],
        kinds: [1, 2, 3],
        authors: ['abc'],
        since: 100,
        until: 200,
        '#tag': ['value']
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

    it('should return false when the event id is not in the filter', () => {
      const filter = {ids: ['123', '456']}

      const event = buildEvent({id: '789'})

      const result = matchFilter(filter, event)

      expect(result).toEqual(false)
    })

    it('should return true when the event id starts with a prefix', () => {
      const filter = {ids: ['22', '00']}

      const event = buildEvent({id: '001'})

      const result = matchFilter(filter, event)

      expect(result).toEqual(true)
    })

    it('should return false when the event kind is not in the filter', () => {
      const filter = {kinds: [1, 2, 3]}

      const event = buildEvent({kind: 4})

      const result = matchFilter(filter, event)

      expect(result).toEqual(false)
    })

    it('should return false when the event author is not in the filter', () => {
      const filter = {authors: ['abc', 'def']}

      const event = buildEvent({pubkey: 'ghi'})

      const result = matchFilter(filter, event)

      expect(result).toEqual(false)
    })

    it('should return false when a tag is not present in the event', () => {
      const filter = {'#tag': ['value1', 'value2']}

      const event = buildEvent({tags: [['not_tag', 'value1']]})

      const result = matchFilter(filter, event)

      expect(result).toEqual(false)
    })

    it('should return false when a tag value is not present in the event', () => {
      const filter = {'#tag': ['value1', 'value2']}

      const event = buildEvent({tags: [['tag', 'value3']]})

      const result = matchFilter(filter, event)

      expect(result).toEqual(false)
    })

    it('should return true when filter has tags that is present in the event', () => {
      const filter = {'#tag1': ['foo']}

      const event = buildEvent({
        id: '123',
        kind: 1,
        pubkey: 'abc',
        created_at: 150,
        tags: [
          ['tag1', 'foo'],
          ['tag2', 'bar']
        ]
      })

      const result = matchFilter(filter, event)

      expect(result).toEqual(true)
    })

    it('should return false when the event is before the filter since value', () => {
      const filter = {since: 100}

      const event = buildEvent({created_at: 50})

      const result = matchFilter(filter, event)

      expect(result).toEqual(false)
    })

    it('should return false when the event is after the filter until value', () => {
      const filter = {until: 100}

      const event = buildEvent({created_at: 150})

      const result = matchFilter(filter, event)

      expect(result).toEqual(false)
    })
  })

  describe('matchFilters', () => {
    it('should return true when at least one filter matches the event', () => {
      const filters = [
        {ids: ['123'], kinds: [1], authors: ['abc']},
        {ids: ['456'], kinds: [2], authors: ['def']},
        {ids: ['789'], kinds: [3], authors: ['ghi']}
      ]

      const event = buildEvent({id: '789', kind: 3, pubkey: 'ghi'})

      const result = matchFilters(filters, event)

      expect(result).toEqual(true)
    })

    it('should return true when at least one prefix matches the event', () => {
      const filters = [
        {ids: ['1'], kinds: [1], authors: ['a']},
        {ids: ['4'], kinds: [2], authors: ['d']},
        {ids: ['9'], kinds: [3], authors: ['g']}
      ]

      const event = buildEvent({id: '987', kind: 3, pubkey: 'ghi'})

      const result = matchFilters(filters, event)

      expect(result).toEqual(true)
    })

    it('should return true when event matches one or more filters and some have limit set', () => {
      const filters = [
        {ids: ['123'], limit: 1},
        {kinds: [1], limit: 2},
        {authors: ['abc'], limit: 3}
      ]

      const event = buildEvent({id: '123', kind: 1, pubkey: 'abc', created_at: 150})

      const result = matchFilters(filters, event)

      expect(result).toEqual(true)
    })

    it('should return false when no filters match the event', () => {
      const filters = [
        {ids: ['123'], kinds: [1], authors: ['abc']},
        {ids: ['456'], kinds: [2], authors: ['def']},
        {ids: ['789'], kinds: [3], authors: ['ghi']}
      ]

      const event = buildEvent({id: '100', kind: 4, pubkey: 'jkl'})

      const result = matchFilters(filters, event)

      expect(result).toEqual(false)
    })

    it('should return false when event matches none of the filters and some have limit set', () => {
      const filters = [
        {ids: ['123'], limit: 1},
        {kinds: [1], limit: 2},
        {authors: ['abc'], limit: 3}
      ]
      const event = buildEvent({id: '456', kind: 2, pubkey: 'def', created_at: 200})

      const result = matchFilters(filters, event)

      expect(result).toEqual(false)
    })
  })
})
