/* eslint-env jest */

const {nip10} = require('./lib/nostr.cjs')

describe('parse NIP10-referenced events', () => {
  test('legacy + a lot of events', () => {
    let event = {
      tags: [
        [
          'e',
          'b857504288c18a15950dd05b9e8772c62ca6289d5aac373c0a8ee5b132e94e7c'
        ],
        [
          'e',
          'bbd72f0ae14374aa8fb166b483cfcf99b57d7f4cf1600ccbf17c350040834631'
        ],
        [
          'e',
          '5e081ebb19153357d7c31e8a10b9ceeef29313f58dc8d701f66727fab02aef64'
        ],
        [
          'e',
          '49aff7ae6daeaaa2777931b90f9bb29f6cb01c5a3d7d88c8ba82d890f264afb4'
        ],
        [
          'e',
          '567b7c11f0fe582361e3cea6fcc7609a8942dfe196ee1b98d5604c93fbeea976'
        ],
        [
          'e',
          '090c037b2e399ee74d9f134758928948dd9154413ca1a1acb37155046e03a051'
        ],
        [
          'e',
          '89f220b63465c93542b1a78caa3a952cf4f196e91a50596493c8093c533ebc4d'
        ],
        [
          'p',
          '77ce56f89d1228f7ff3743ce1ad1b254857b9008564727ebd5a1f317362f6ca7'
        ],
        [
          'p',
          '534780e44da7b494485e85cd4cca6af4f6caa1627472432b6f2a4ece0e9e54ec'
        ],
        [
          'p',
          '4ca4f5533e40da5e0508796d409e6bb35a50b26fc304345617ab017183d83ac0'
        ]
      ]
    }

    expect(nip10.parse(event)).toEqual({
      mentions: [
        {
          id: 'bbd72f0ae14374aa8fb166b483cfcf99b57d7f4cf1600ccbf17c350040834631',
          relays: []
        },
        {
          id: '5e081ebb19153357d7c31e8a10b9ceeef29313f58dc8d701f66727fab02aef64',
          relays: []
        },
        {
          id: '49aff7ae6daeaaa2777931b90f9bb29f6cb01c5a3d7d88c8ba82d890f264afb4',
          relays: []
        },
        {
          id: '567b7c11f0fe582361e3cea6fcc7609a8942dfe196ee1b98d5604c93fbeea976',
          relays: []
        },
        {
          id: '090c037b2e399ee74d9f134758928948dd9154413ca1a1acb37155046e03a051',
          relays: []
        }
      ],
      pubkeys: [
        '77ce56f89d1228f7ff3743ce1ad1b254857b9008564727ebd5a1f317362f6ca7',
        '534780e44da7b494485e85cd4cca6af4f6caa1627472432b6f2a4ece0e9e54ec',
        '4ca4f5533e40da5e0508796d409e6bb35a50b26fc304345617ab017183d83ac0'
      ],
      reply: {
        id: '89f220b63465c93542b1a78caa3a952cf4f196e91a50596493c8093c533ebc4d',
        relays: []
      },
      root: {
        id: 'b857504288c18a15950dd05b9e8772c62ca6289d5aac373c0a8ee5b132e94e7c',
        relays: []
      }
    })
  })

  test('legacy + 3 events', () => {
    let event = {
      tags: [
        [
          'e',
          'b857504288c18a15950dd05b9e8772c62ca6289d5aac373c0a8ee5b132e94e7c'
        ],
        [
          'e',
          'bbd72f0ae14374aa8fb166b483cfcf99b57d7f4cf1600ccbf17c350040834631'
        ],
        [
          'e',
          '5e081ebb19153357d7c31e8a10b9ceeef29313f58dc8d701f66727fab02aef64'
        ],
        [
          'p',
          '77ce56f89d1228f7ff3743ce1ad1b254857b9008564727ebd5a1f317362f6ca7'
        ],
        [
          'p',
          '534780e44da7b494485e85cd4cca6af4f6caa1627472432b6f2a4ece0e9e54ec'
        ],
        [
          'p',
          '4ca4f5533e40da5e0508796d409e6bb35a50b26fc304345617ab017183d83ac0'
        ]
      ]
    }

    expect(nip10.parse(event)).toEqual({
      mentions: [
        {
          id: 'bbd72f0ae14374aa8fb166b483cfcf99b57d7f4cf1600ccbf17c350040834631',
          relays: []
        }
      ],
      pubkeys: [
        '77ce56f89d1228f7ff3743ce1ad1b254857b9008564727ebd5a1f317362f6ca7',
        '534780e44da7b494485e85cd4cca6af4f6caa1627472432b6f2a4ece0e9e54ec',
        '4ca4f5533e40da5e0508796d409e6bb35a50b26fc304345617ab017183d83ac0'
      ],
      reply: {
        id: '5e081ebb19153357d7c31e8a10b9ceeef29313f58dc8d701f66727fab02aef64',
        relays: []
      },
      root: {
        id: 'b857504288c18a15950dd05b9e8772c62ca6289d5aac373c0a8ee5b132e94e7c',
        relays: []
      }
    })
  })

  test('legacy + 2 events', () => {
    let event = {
      tags: [
        [
          'e',
          'b857504288c18a15950dd05b9e8772c62ca6289d5aac373c0a8ee5b132e94e7c'
        ],
        [
          'e',
          'bbd72f0ae14374aa8fb166b483cfcf99b57d7f4cf1600ccbf17c350040834631'
        ],
        [
          'p',
          '77ce56f89d1228f7ff3743ce1ad1b254857b9008564727ebd5a1f317362f6ca7'
        ],
        [
          'p',
          '534780e44da7b494485e85cd4cca6af4f6caa1627472432b6f2a4ece0e9e54ec'
        ],
        [
          'p',
          '4ca4f5533e40da5e0508796d409e6bb35a50b26fc304345617ab017183d83ac0'
        ]
      ]
    }

    expect(nip10.parse(event)).toEqual({
      mentions: [],
      pubkeys: [
        '77ce56f89d1228f7ff3743ce1ad1b254857b9008564727ebd5a1f317362f6ca7',
        '534780e44da7b494485e85cd4cca6af4f6caa1627472432b6f2a4ece0e9e54ec',
        '4ca4f5533e40da5e0508796d409e6bb35a50b26fc304345617ab017183d83ac0'
      ],
      reply: {
        id: 'bbd72f0ae14374aa8fb166b483cfcf99b57d7f4cf1600ccbf17c350040834631',
        relays: []
      },
      root: {
        id: 'b857504288c18a15950dd05b9e8772c62ca6289d5aac373c0a8ee5b132e94e7c',
        relays: []
      }
    })
  })

  test('legacy + 1 event', () => {
    let event = {
      tags: [
        [
          'e',
          '9abbfd9b9ac5ecdab45d14b8bf8d746139ea039e931a1b376d19a239f1946590'
        ],
        [
          'p',
          '534780e44da7b494485e85cd4cca6af4f6caa1627472432b6f2a4ece0e9e54ec'
        ]
      ]
    }

    expect(nip10.parse(event)).toEqual({
      mentions: [],
      pubkeys: [
        '534780e44da7b494485e85cd4cca6af4f6caa1627472432b6f2a4ece0e9e54ec'
      ],
      reply: undefined,
      root: {
        id: '9abbfd9b9ac5ecdab45d14b8bf8d746139ea039e931a1b376d19a239f1946590',
        relays: []
      }
    })
  })

  // No events with NIP-10 explicit root/reply/mention markers were found in the wild for these tests :(
  test.todo('recommended + a lot of events')
  test.todo('recommended + 3 events')
  test.todo('recommended + 2 events')
  test.todo('recommended + 1 event')
})
