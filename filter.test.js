/* eslint-env jest */

const {matchFilters} = require('./lib/nostr.cjs')

test('test if filters match', () => {
  ;[
    {
      filters: [{ids: ['i']}],
      good: [{id: 'i'}],
      bad: [{id: 'j'}]
    },
    {
      filters: [{authors: ['abc']}, {kinds: [1, 3]}],
      good: [
        {pubkey: 'xyz', kind: 3},
        {pubkey: 'abc', kind: 12},
        {pubkey: 'abc', kind: 1}
      ],
      bad: [{pubkey: 'hhh', kind: 12}]
    },
    {
      filters: [{'#e': ['yyy'], since: 444}],
      good: [
        {
          tags: [
            ['e', 'uuu'],
            ['e', 'yyy']
          ],
          created_at: 555
        }
      ],
      bad: [{tags: [['e', 'uuu']], created_at: 111}]
    }
  ].forEach(({filters, good, bad}) => {
    good.forEach(ev => {
      expect(matchFilters(filters, ev)).toBeTruthy()
    })
    bad.forEach(ev => {
      expect(matchFilters(filters, ev)).toBeFalsy()
    })
  })
})
