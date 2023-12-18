import { describe, test, expect } from 'bun:test'
import { parse } from './nip10.ts'

describe('parse NIP10-referenced events', () => {
  test('legacy + a lot of events', () => {
    let event = {
      tags: [
        ['e', 'b857504288c18a15950dd05b9e8772c62ca6289d5aac373c0a8ee5b132e94e7c'],
        ['e', 'bbd72f0ae14374aa8fb166b483cfcf99b57d7f4cf1600ccbf17c350040834631'],
        ['e', '5e081ebb19153357d7c31e8a10b9ceeef29313f58dc8d701f66727fab02aef64'],
        ['e', '49aff7ae6daeaaa2777931b90f9bb29f6cb01c5a3d7d88c8ba82d890f264afb4'],
        ['e', '567b7c11f0fe582361e3cea6fcc7609a8942dfe196ee1b98d5604c93fbeea976'],
        ['e', '090c037b2e399ee74d9f134758928948dd9154413ca1a1acb37155046e03a051'],
        ['e', '89f220b63465c93542b1a78caa3a952cf4f196e91a50596493c8093c533ebc4d'],
        ['p', '77ce56f89d1228f7ff3743ce1ad1b254857b9008564727ebd5a1f317362f6ca7'],
        ['p', '534780e44da7b494485e85cd4cca6af4f6caa1627472432b6f2a4ece0e9e54ec'],
        ['p', '4ca4f5533e40da5e0508796d409e6bb35a50b26fc304345617ab017183d83ac0'],
      ],
    }

    expect(parse(event)).toEqual({
      mentions: [
        {
          id: 'bbd72f0ae14374aa8fb166b483cfcf99b57d7f4cf1600ccbf17c350040834631',
          relays: [],
        },
        {
          id: '5e081ebb19153357d7c31e8a10b9ceeef29313f58dc8d701f66727fab02aef64',
          relays: [],
        },
        {
          id: '49aff7ae6daeaaa2777931b90f9bb29f6cb01c5a3d7d88c8ba82d890f264afb4',
          relays: [],
        },
        {
          id: '567b7c11f0fe582361e3cea6fcc7609a8942dfe196ee1b98d5604c93fbeea976',
          relays: [],
        },
        {
          id: '090c037b2e399ee74d9f134758928948dd9154413ca1a1acb37155046e03a051',
          relays: [],
        },
      ],
      profiles: [
        {
          pubkey: '77ce56f89d1228f7ff3743ce1ad1b254857b9008564727ebd5a1f317362f6ca7',
          relays: [],
        },
        {
          pubkey: '534780e44da7b494485e85cd4cca6af4f6caa1627472432b6f2a4ece0e9e54ec',
          relays: [],
        },
        {
          pubkey: '4ca4f5533e40da5e0508796d409e6bb35a50b26fc304345617ab017183d83ac0',
          relays: [],
        },
      ],
      reply: {
        id: '89f220b63465c93542b1a78caa3a952cf4f196e91a50596493c8093c533ebc4d',
        relays: [],
      },
      root: {
        id: 'b857504288c18a15950dd05b9e8772c62ca6289d5aac373c0a8ee5b132e94e7c',
        relays: [],
      },
    })
  })

  test('legacy + 3 events', () => {
    let event = {
      tags: [
        ['e', 'b857504288c18a15950dd05b9e8772c62ca6289d5aac373c0a8ee5b132e94e7c'],
        ['e', 'bbd72f0ae14374aa8fb166b483cfcf99b57d7f4cf1600ccbf17c350040834631'],
        ['e', '5e081ebb19153357d7c31e8a10b9ceeef29313f58dc8d701f66727fab02aef64'],
        ['p', '77ce56f89d1228f7ff3743ce1ad1b254857b9008564727ebd5a1f317362f6ca7'],
        ['p', '534780e44da7b494485e85cd4cca6af4f6caa1627472432b6f2a4ece0e9e54ec'],
        ['p', '4ca4f5533e40da5e0508796d409e6bb35a50b26fc304345617ab017183d83ac0'],
      ],
    }

    expect(parse(event)).toEqual({
      mentions: [
        {
          id: 'bbd72f0ae14374aa8fb166b483cfcf99b57d7f4cf1600ccbf17c350040834631',
          relays: [],
        },
      ],
      profiles: [
        {
          pubkey: '77ce56f89d1228f7ff3743ce1ad1b254857b9008564727ebd5a1f317362f6ca7',
          relays: [],
        },
        {
          pubkey: '534780e44da7b494485e85cd4cca6af4f6caa1627472432b6f2a4ece0e9e54ec',
          relays: [],
        },
        {
          pubkey: '4ca4f5533e40da5e0508796d409e6bb35a50b26fc304345617ab017183d83ac0',
          relays: [],
        },
      ],
      reply: {
        id: '5e081ebb19153357d7c31e8a10b9ceeef29313f58dc8d701f66727fab02aef64',
        relays: [],
      },
      root: {
        id: 'b857504288c18a15950dd05b9e8772c62ca6289d5aac373c0a8ee5b132e94e7c',
        relays: [],
      },
    })
  })

  test('legacy + 2 events', () => {
    let event = {
      tags: [
        ['e', 'b857504288c18a15950dd05b9e8772c62ca6289d5aac373c0a8ee5b132e94e7c'],
        ['e', 'bbd72f0ae14374aa8fb166b483cfcf99b57d7f4cf1600ccbf17c350040834631'],
        ['p', '77ce56f89d1228f7ff3743ce1ad1b254857b9008564727ebd5a1f317362f6ca7'],
        ['p', '534780e44da7b494485e85cd4cca6af4f6caa1627472432b6f2a4ece0e9e54ec'],
        ['p', '4ca4f5533e40da5e0508796d409e6bb35a50b26fc304345617ab017183d83ac0'],
      ],
    }

    expect(parse(event)).toEqual({
      mentions: [],
      profiles: [
        {
          pubkey: '77ce56f89d1228f7ff3743ce1ad1b254857b9008564727ebd5a1f317362f6ca7',
          relays: [],
        },
        {
          pubkey: '534780e44da7b494485e85cd4cca6af4f6caa1627472432b6f2a4ece0e9e54ec',
          relays: [],
        },
        {
          pubkey: '4ca4f5533e40da5e0508796d409e6bb35a50b26fc304345617ab017183d83ac0',
          relays: [],
        },
      ],
      reply: {
        id: 'bbd72f0ae14374aa8fb166b483cfcf99b57d7f4cf1600ccbf17c350040834631',
        relays: [],
      },
      root: {
        id: 'b857504288c18a15950dd05b9e8772c62ca6289d5aac373c0a8ee5b132e94e7c',
        relays: [],
      },
    })
  })

  test('legacy + 1 event', () => {
    let event = {
      tags: [
        ['e', '9abbfd9b9ac5ecdab45d14b8bf8d746139ea039e931a1b376d19a239f1946590'],
        ['p', '534780e44da7b494485e85cd4cca6af4f6caa1627472432b6f2a4ece0e9e54ec'],
      ],
    }

    expect(parse(event)).toEqual({
      mentions: [],
      profiles: [
        {
          pubkey: '534780e44da7b494485e85cd4cca6af4f6caa1627472432b6f2a4ece0e9e54ec',
          relays: [],
        },
      ],
      reply: undefined,
      root: {
        id: '9abbfd9b9ac5ecdab45d14b8bf8d746139ea039e931a1b376d19a239f1946590',
        relays: [],
      },
    })
  })

  test('recommended + 1 event', () => {
    let event = {
      tags: [
        ['p', 'a8c21fcd8aa1f4befba14d72fc7a012397732d30d8b3131af912642f3c726f52', 'wss://relay.mostr.pub'],
        ['p', '003d7fd21fd09ff7f6f63a75daf194dd99feefbe6919cc376b7359d5090aa9a6', 'wss://relay.mostr.pub'],
        ['p', '2f6fbe452edd3987d3c67f3b034c03ec5bcf4d054c521c3a954686f89f03212e', 'wss://relay.mostr.pub'],
        ['p', '44c7c74668ff222b0e0b30579c49fc6e22dafcdeaad091036c947f9856590f1e', 'wss://relay.mostr.pub'],
        ['p', 'c5cf39149caebda4cdd61771c51f6ba91ef5645919004e5c4998a4ea69f00512', 'wss://relay.mostr.pub'],
        ['p', '094d44bb1e812696c57f57ad1c0c707812dedbe72c07e538b80639032c236a9e', 'wss://relay.mostr.pub'],
        ['p', 'a1ba0ac9b6ec098f726a3c11ec654df4a32cbb84b5377e8788395e9c27d9ecda', 'wss://relay.mostr.pub'],
        ['e', 'f9472913904ab7e9da008dcb2d85fd4af2d2993ada483d00c646d0c4481d031d', 'wss://relay.mostr.pub', 'reply'],
        ['mostr', 'https://poa.st/objects/dc50684b-6364-4264-ab16-49f4622f05ea'],
      ],
    }

    expect(parse(event)).toEqual({
      mentions: [],
      profiles: [
        {
          pubkey: 'a8c21fcd8aa1f4befba14d72fc7a012397732d30d8b3131af912642f3c726f52',
          relays: ['wss://relay.mostr.pub'],
        },
        {
          pubkey: '003d7fd21fd09ff7f6f63a75daf194dd99feefbe6919cc376b7359d5090aa9a6',
          relays: ['wss://relay.mostr.pub'],
        },
        {
          pubkey: '2f6fbe452edd3987d3c67f3b034c03ec5bcf4d054c521c3a954686f89f03212e',
          relays: ['wss://relay.mostr.pub'],
        },
        {
          pubkey: '44c7c74668ff222b0e0b30579c49fc6e22dafcdeaad091036c947f9856590f1e',
          relays: ['wss://relay.mostr.pub'],
        },
        {
          pubkey: 'c5cf39149caebda4cdd61771c51f6ba91ef5645919004e5c4998a4ea69f00512',
          relays: ['wss://relay.mostr.pub'],
        },
        {
          pubkey: '094d44bb1e812696c57f57ad1c0c707812dedbe72c07e538b80639032c236a9e',
          relays: ['wss://relay.mostr.pub'],
        },
        {
          pubkey: 'a1ba0ac9b6ec098f726a3c11ec654df4a32cbb84b5377e8788395e9c27d9ecda',
          relays: ['wss://relay.mostr.pub'],
        },
      ],
      reply: {
        id: 'f9472913904ab7e9da008dcb2d85fd4af2d2993ada483d00c646d0c4481d031d',
        relays: ['wss://relay.mostr.pub'],
      },
      root: undefined,
    })
  })
})
