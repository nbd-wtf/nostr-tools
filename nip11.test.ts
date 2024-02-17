import { describe, test, expect } from 'bun:test'
import fetch from 'node-fetch'
import { useFetchImplementation, fetchRelayInformation } from './nip11'

// TODO: replace with a mock
describe('requesting relay as for NIP11', () => {
  useFetchImplementation(fetch)

  test('testing a relay', async () => {
    const info = await fetchRelayInformation('wss://atlas.nostr.land')
    expect(info.name).toEqual('nostr.land')
    expect(info.description).toContain('nostr.land family')
    expect(info.fees).toBeTruthy()
    expect(info.supported_nips).toEqual([1, 2, 4, 9, 11, 12, 16, 20, 22, 28, 33, 40])
    expect(info.software).toEqual('custom')
  })
})
