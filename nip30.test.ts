import { test, expect } from 'bun:test'
import { matchAll, replaceAll } from './nip30.ts'

test('matchAll', () => {
  const result = matchAll('Hello :blobcat: :disputed: ::joy:joy:')

  expect([...result]).toEqual([
    {
      name: 'blobcat',
      shortcode: ':blobcat:',
      start: 6,
      end: 15,
    },
    {
      name: 'disputed',
      shortcode: ':disputed:',
      start: 16,
      end: 26,
    },
  ])
})

test('replaceAll', () => {
  const content = 'Hello :blobcat: :disputed: ::joy:joy:'

  const result = replaceAll(content, ({ name }) => {
    return `<img src="https://ditto.pub/emoji/${name}.png" />`
  })

  expect(result).toEqual(
    'Hello <img src="https://ditto.pub/emoji/blobcat.png" /> <img src="https://ditto.pub/emoji/disputed.png" /> ::joy:joy:',
  )
})

test('shortcodes can contain hyphens', () => {
  const content = 'Hi :party-parrot: :blob_cat-2: a-:smile:'

  expect([...matchAll(content)]).toEqual([
    { name: 'party-parrot', shortcode: ':party-parrot:', start: 3, end: 17 },
    { name: 'blob_cat-2', shortcode: ':blob_cat-2:', start: 18, end: 30 },
    { name: 'smile', shortcode: ':smile:', start: 33, end: 40 },
  ])

  expect(replaceAll(content, ({ name }) => `[${name}]`)).toEqual('Hi [party-parrot] [blob_cat-2] a-[smile]')
})
