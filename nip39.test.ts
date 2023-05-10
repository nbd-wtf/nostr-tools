import fetch from 'node-fetch'
import {nip39} from '.'

test('validate github claim', async () => {
  nip39.useFetchImplementation(fetch)

  let result = await nip39.validateGithub(
    'npub1gcxzte5zlkncx26j68ez60fzkvtkm9e0vrwdcvsjakxf9mu9qewqlfnj5z',
    'vitorpamplona',
    'cf19e2d1d7f8dac6348ad37b35ec8421'
  )
  expect(result).toBe(true)
})
