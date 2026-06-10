import { describe, test, expect } from 'bun:test'
import { parse } from './nip22.ts'

describe('parse NIP22 comment references', () => {
  test('top-level comment on addressable event', () => {
    expect(
      parse({
        tags: [
          [
            'A',
            '30023:3c9849383bdea883b0bd16fece1ed36d37e37cdde3ce43b17ea4e9192ec11289:f9347ca7',
            'wss://example.relay',
          ],
          ['K', '30023'],
          ['P', '3c9849383bdea883b0bd16fece1ed36d37e37cdde3ce43b17ea4e9192ec11289', 'wss://example.relay'],
          [
            'a',
            '30023:3c9849383bdea883b0bd16fece1ed36d37e37cdde3ce43b17ea4e9192ec11289:f9347ca7',
            'wss://example.relay',
          ],
          [
            'e',
            '5b4fc7fed15672fefe65d2426f67197b71ccc82aa0cc8a9e94f683eb78e07651',
            'wss://example.relay',
            '3c9849383bdea883b0bd16fece1ed36d37e37cdde3ce43b17ea4e9192ec11289',
          ],
          ['k', '30023'],
          ['p', '3c9849383bdea883b0bd16fece1ed36d37e37cdde3ce43b17ea4e9192ec11289', 'wss://example.relay'],
        ],
      }),
    ).toEqual({
      root: {
        kind: 30023,
        pubkey: '3c9849383bdea883b0bd16fece1ed36d37e37cdde3ce43b17ea4e9192ec11289',
        identifier: 'f9347ca7',
        relays: ['wss://example.relay'],
      },
      rootKind: 30023,
      reply: {
        kind: 30023,
        pubkey: '3c9849383bdea883b0bd16fece1ed36d37e37cdde3ce43b17ea4e9192ec11289',
        identifier: 'f9347ca7',
        relays: ['wss://example.relay'],
      },
      replyKind: 30023,
      mentions: [],
      quotes: [],
      profiles: [
        {
          pubkey: '3c9849383bdea883b0bd16fece1ed36d37e37cdde3ce43b17ea4e9192ec11289',
          relays: ['wss://example.relay'],
        },
        {
          pubkey: '3c9849383bdea883b0bd16fece1ed36d37e37cdde3ce43b17ea4e9192ec11289',
          relays: ['wss://example.relay'],
        },
      ],
    })
  })

  test('reply to comment with quote', () => {
    expect(
      parse({
        tags: [
          [
            'E',
            '768ac8720cdeb59227cf95e98b66560ef03d8bc9a90d721779e76e68fb42f5e6',
            'wss://example.relay',
            'fd913cd6fa9edb8405750cd02a8bbe16e158b8676c0e69fdc27436cc4a54cc9a',
          ],
          ['K', '1063'],
          ['P', 'fd913cd6fa9edb8405750cd02a8bbe16e158b8676c0e69fdc27436cc4a54cc9a'],
          [
            'e',
            '5c83da77af1dec6d7289834998ad7aafbd9e2191396d75ec3cc27f5a77226f36',
            'wss://example.relay',
            '93ef2ebaaf9554661f33e79949007900bbc535d239a4c801c33a4d67d3e7f546',
          ],
          ['k', '1111'],
          ['p', '93ef2ebaaf9554661f33e79949007900bbc535d239a4c801c33a4d67d3e7f546', 'wss://parent.relay'],
          [
            'q',
            '680f14330f3f8b24d9b86137ad9a6ef0c7a955c31cbea02e9f53a25a1fce9d6f',
            'wss://quote.relay',
            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          ],
        ],
      }),
    ).toEqual({
      root: {
        id: '768ac8720cdeb59227cf95e98b66560ef03d8bc9a90d721779e76e68fb42f5e6',
        relays: ['wss://example.relay'],
        author: 'fd913cd6fa9edb8405750cd02a8bbe16e158b8676c0e69fdc27436cc4a54cc9a',
      },
      rootKind: 1063,
      reply: {
        id: '5c83da77af1dec6d7289834998ad7aafbd9e2191396d75ec3cc27f5a77226f36',
        relays: ['wss://example.relay', 'wss://parent.relay'],
        author: '93ef2ebaaf9554661f33e79949007900bbc535d239a4c801c33a4d67d3e7f546',
      },
      replyKind: 1111,
      mentions: [],
      quotes: [
        {
          id: '680f14330f3f8b24d9b86137ad9a6ef0c7a955c31cbea02e9f53a25a1fce9d6f',
          relays: ['wss://quote.relay'],
          author: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        },
      ],
      profiles: [
        {
          pubkey: 'fd913cd6fa9edb8405750cd02a8bbe16e158b8676c0e69fdc27436cc4a54cc9a',
          relays: ['wss://example.relay'],
        },
        {
          pubkey: '93ef2ebaaf9554661f33e79949007900bbc535d239a4c801c33a4d67d3e7f546',
          relays: ['wss://example.relay', 'wss://parent.relay'],
        },
      ],
    })
  })

  test('comment on external identifier', () => {
    expect(
      parse({
        tags: [
          ['I', 'https://abc.com/articles/1'],
          ['K', 'web'],
          ['i', 'https://abc.com/articles/1'],
          ['k', 'web'],
        ],
      }),
    ).toEqual({
      root: {
        value: 'https://abc.com/articles/1',
        hint: undefined,
      },
      rootKind: 'web',
      reply: {
        value: 'https://abc.com/articles/1',
        hint: undefined,
      },
      replyKind: 'web',
      mentions: [],
      quotes: [],
      profiles: [],
    })
  })
})
