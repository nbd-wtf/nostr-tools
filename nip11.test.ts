import {Nip11} from './nip11'
const requestRelayInfos = Nip11.requestRelayInfos

describe('requesting Relay infos as for NIP11', () => {
  test('testing damus relay', async () => {
    const expected_relay_name = 'relay.nostr.nu'
    const expected_relay_description =
      'A nostr relay build by Edward Hollander.'
    const expected_supported_nips = [
      1, 2, 4, 9, 11, 12, 15, 16, 20, 22, 26, 28, 33, 40
    ]

    const test_relay = 'https://relay.nostr.nu'
    const relay_infos = await requestRelayInfos(test_relay)
    const relay_name = relay_infos.name
    const relay_description = relay_infos.description
    const fees = relay_infos.fees
    const admission = fees?.admission
    const supported_nips = relay_infos.supported_nips
    const admission_condition = Array.isArray(admission)
    expect(relay_name).toBe(expected_relay_name)
    expect(relay_description).toBe(expected_relay_description)
    expect(fees).toBeTruthy()
    expect(admission_condition).toBeTruthy()
    expect(supported_nips).toMatchObject(expected_supported_nips)
  })
})
