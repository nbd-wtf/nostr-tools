import { test, expect } from 'bun:test'
import { matchAll, replaceAll } from './nip27.ts'

test('matchAll', () => {
  const result = matchAll(
    'Hello nostr:npub108pv4cg5ag52nq082kd5leu9ffrn2gdg6g4xdwatn73y36uzplmq9uyev6!\n\nnostr:note1gmtnz6q2m55epmlpe3semjdcq987av3jvx4emmjsa8g3s9x7tg4sclreky',
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
      uri: 'nostr:note1gmtnz6q2m55epmlpe3semjdcq987av3jvx4emmjsa8g3s9x7tg4sclreky',
      value: 'note1gmtnz6q2m55epmlpe3semjdcq987av3jvx4emmjsa8g3s9x7tg4sclreky',
      decoded: {
        type: 'note',
        data: '46d731680add2990efe1cc619dc9b8014feeb23261ab9dee50e9d11814de5a2b',
      },
      start: 78,
      end: 147,
    },
  ])
})

test('matchAll with an invalid nip19', () => {
  const result = matchAll(
    'Hello nostr:npub129tvj896hqqkljerxkccpj9flshwnw999v9uwn9lfmwlj8vnzwgq9y5llnpub1rujdpkd8mwezrvpqd2rx2zphfaztqrtsfg6w3vdnlj!\n\nnostr:note1gmtnz6q2m55epmlpe3semjdcq987av3jvx4emmjsa8g3s9x7tg4sclreky',
  )

  expect([...result]).toEqual([
    {
      decoded: {
        data: '46d731680add2990efe1cc619dc9b8014feeb23261ab9dee50e9d11814de5a2b',
        type: 'note',
      },
      end: 193,
      start: 124,
      uri: 'nostr:note1gmtnz6q2m55epmlpe3semjdcq987av3jvx4emmjsa8g3s9x7tg4sclreky',
      value: 'note1gmtnz6q2m55epmlpe3semjdcq987av3jvx4emmjsa8g3s9x7tg4sclreky',
    },
  ])
})

test('replaceAll', () => {
  const content =
    'Hello nostr:npub108pv4cg5ag52nq082kd5leu9ffrn2gdg6g4xdwatn73y36uzplmq9uyev6!\n\nnostr:note1gmtnz6q2m55epmlpe3semjdcq987av3jvx4emmjsa8g3s9x7tg4sclreky'

  const result = replaceAll(content, ({ decoded, value }) => {
    switch (decoded.type) {
      case 'npub':
        return '@alex'
      case 'note':
        return '!1234'
      default:
        return value
    }
  })

  expect(result).toEqual('Hello @alex!\n\n!1234')
})
