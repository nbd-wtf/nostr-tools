/* eslint-env jest */
const {nip21} = require('./lib/nostr.cjs')

test('test', () => {
  expect(
    nip21.test(
      'nostr:npub108pv4cg5ag52nq082kd5leu9ffrn2gdg6g4xdwatn73y36uzplmq9uyev6'
    )
  ).toBe(true)
  expect(
    nip21.test(
      'nostr:note1gmtnz6q2m55epmlpe3semjdcq987av3jvx4emmjsa8g3s9x7tg4sclreky'
    )
  ).toBe(true)
  expect(
    nip21.test(
      ' nostr:npub108pv4cg5ag52nq082kd5leu9ffrn2gdg6g4xdwatn73y36uzplmq9uyev6'
    )
  ).toBe(false)
  expect(nip21.test('nostr:')).toBe(false)
  expect(
    nip21.test(
      'nostr:npub108pv4cg5ag52nQq082kd5leu9ffrn2gdg6g4xdwatn73y36uzplmq9uyev6'
    )
  ).toBe(false)
  expect(nip21.test('gggggg')).toBe(false)
})

test('parse', () => {
  const result = nip21.parse(
    'nostr:note1gmtnz6q2m55epmlpe3semjdcq987av3jvx4emmjsa8g3s9x7tg4sclreky'
  )

  expect(result).toEqual({
    uri: 'nostr:note1gmtnz6q2m55epmlpe3semjdcq987av3jvx4emmjsa8g3s9x7tg4sclreky',
    value: 'note1gmtnz6q2m55epmlpe3semjdcq987av3jvx4emmjsa8g3s9x7tg4sclreky',
    decoded: {
      type: 'note',
      data: '46d731680add2990efe1cc619dc9b8014feeb23261ab9dee50e9d11814de5a2b'
    }
  })
})
