import {privateKeyFromSeedWords} from './nip06.ts'

test('generate private key from a mnemonic', async () => {
  const mnemonic = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong'
  const privateKey = privateKeyFromSeedWords(mnemonic)
  expect(privateKey).toEqual(
    'c26cf31d8ba425b555ca27d00ca71b5008004f2f662470f8c8131822ec129fe2'
  )
})

test('generate private key for account 1 from a mnemonic', async () => {
  const mnemonic = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong'
  const privateKey = privateKeyFromSeedWords(mnemonic, undefined, 1)
  expect(privateKey).toEqual(
    'b5fc7f229de3fb5c189063e3b3fc6c921d8f4366cff5bd31c6f063493665eb2b'
  )
})

test('generate private key from a mnemonic and passphrase', async () => {
  const mnemonic = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong'
  const passphrase = '123'
  const privateKey = privateKeyFromSeedWords(mnemonic, passphrase)
  expect(privateKey).toEqual(
    '55a22b8203273d0aaf24c22c8fbe99608e70c524b17265641074281c8b978ae4'
  )
})

test('generate private key for account 1 from a mnemonic and passphrase', async () => {
  const mnemonic = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong'
  const passphrase = '123'
  const privateKey = privateKeyFromSeedWords(mnemonic, passphrase, 1)
  expect(privateKey).toEqual(
    '2e0f7bd9e3c3ebcdff1a90fb49c913477e7c055eba1a415d571b6a8c714c7135'
  )
})
