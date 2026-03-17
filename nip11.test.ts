import { describe, test, expect } from 'bun:test'
import fetch from 'node-fetch'
import { useFetchImplementation, fetchRelayInformation } from './nip11.ts'

// TODO: replace with a mock
describe('requesting relay as for NIP11', () => {
  useFetchImplementation(fetch)

  test('testing a relay', async () => {
    const info = await fetchRelayInformation('wss://nos.lol')
    expect(info.name).toEqual('nos.lol')
    expect(info.description).toContain('Generally accepts notes, except spammy ones.')
    expect(info.supported_nips).toContain(1)
    expect(info.supported_nips).toContain(11)
    expect(info.supported_nips).toContain(70)
    expect(info.software).toEqual('git+https://github.com/hoytech/strfry.git')
  })
})
