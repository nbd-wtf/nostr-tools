import { test, expect } from 'bun:test'
import { test as testRegex, parse } from './nip21.ts'

test('test()', () => {
  expect(testRegex('nostr:npub108pv4cg5ag52nq082kd5leu9ffrn2gdg6g4xdwatn73y36uzplmq9uyev6')).toBe(true)
  expect(testRegex(' nostr:npub108pv4cg5ag52nq082kd5leu9ffrn2gdg6g4xdwatn73y36uzplmq9uyev6')).toBe(false)
  expect(testRegex('nostr:')).toBe(false)
  expect(testRegex('nostr:npub108pv4cg5ag52nQq082kd5leu9ffrn2gdg6g4xdwatn73y36uzplmq9uyev6')).toBe(false)
  expect(testRegex('gggggg')).toBe(false)
})

test('parse', () => {
  const result = parse('nostr:npub108pv4cg5ag52nq082kd5leu9ffrn2gdg6g4xdwatn73y36uzplmq9uyev6')

  expect(result).toEqual({
    uri: 'nostr:npub108pv4cg5ag52nq082kd5leu9ffrn2gdg6g4xdwatn73y36uzplmq9uyev6',
    value: 'npub108pv4cg5ag52nq082kd5leu9ffrn2gdg6g4xdwatn73y36uzplmq9uyev6',
    decoded: {
      type: 'npub',
      data: '79c2cae114ea28a981e7559b4fe7854a473521a8d22a66bbab9fa248eb820ff6',
    },
  })
})
