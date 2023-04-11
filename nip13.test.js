/* eslint-env jest */
const {nip13} = require('./lib/nostr.cjs')

test('identifies proof-of-work difficulty', async () => {
  const id = '000006d8c378af1779d2feebc7603a125d99eca0ccf1085959b307f64e5dd358'
  const difficulty = nip13.getPow(id)
  expect(difficulty).toEqual(21)
})
