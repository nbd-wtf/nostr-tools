import { test, expect } from 'bun:test'
import { matchAll, replaceAll } from './nip27.ts'

test('matchAll', () => {
  const result = matchAll(
    'Hello nostr:npub108pv4cg5ag52nq082kd5leu9ffrn2gdg6g4xdwatn73y36uzplmq9uyev6!\n\nnostr:nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9',
  )

  expect([...result]).toEqual([
    {
      uri: 'nostr:npub108pv4cg5ag52nq082kd5leu9ffrn2gdg6g4xdwatn73y36uzplmq9uyev6',
      value: 'npub108pv4cg5ag52nq082kd5leu9ffrn2gdg6g4xdwatn73y36uzplmq9uyev6',
      decoded: {
        type: 'npub',
        data: '79c2cae114ea28a981e7559b4fe7854a473521a8d22a66bbab9fa248eb820ff6',
      },
      start: 6,
      end: 75,
    },
    {
      uri: 'nostr:nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9',
      value: 'nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9',
      decoded: {
        type: 'nevent',
        data: {
          id: 'b3e392b11f5d4f28321cedd09303a748acfd0487aea5a7450b3481c60b6e4f87',
          relays: ['wss://relay.example.com'],
        },
      },
      start: 78,
      end: 192,
    },
  ])
})

test('matchAll with an invalid nip19', () => {
  const result = matchAll(
    'Hello nostr:npub129tvj896hqqkljerxkccpj9flshwnw999v9uwn9lfmwlj8vnzwgq9y5llnpub1rujdpkd8mwezrvpqd2rx2zphfaztqrtsfg6w3vdnlj!\n\nnostr:nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9',
  )

  expect([...result]).toEqual([
    {
      decoded: {
        data: {
          id: 'b3e392b11f5d4f28321cedd09303a748acfd0487aea5a7450b3481c60b6e4f87',
          relays: ['wss://relay.example.com'],
        },
        type: 'nevent',
      },
      end: 238,
      start: 124,
      uri: 'nostr:nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9',
      value: 'nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9',
    },
  ])
})

test('replaceAll', () => {
  const content =
    'Hello nostr:npub108pv4cg5ag52nq082kd5leu9ffrn2gdg6g4xdwatn73y36uzplmq9uyev6!\n\nnostr:nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9'

  const result = replaceAll(content, ({ decoded, value }) => {
    switch (decoded.type) {
      case 'npub':
        return '@alex'
      case 'nevent':
        return '!1234'
      default:
        return value
    }
  })

  expect(result).toEqual('Hello @alex!\n\n!1234')
})
