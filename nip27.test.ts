import { test, expect } from 'bun:test'
import { parse } from './nip27.ts'
import { NostrEvent } from './core.ts'

test('first: parse simple content with 1 url and 1 nostr uri', () => {
  const content = `nostr:npub1hpslpc8c5sp3e2nhm2fr7swsfqpys5vyjar5dwpn7e7decps6r8qkcln63 check out my profile:nostr:npub1xtscya34g58tk0z605fvr788k263gsu6cy9x0mhnm87echrgufzsevkk5s; and this cool image https://images.com/image.jpg`
  const blocks = Array.from(parse(content))

  expect(blocks).toEqual([
    {
      type: 'reference',
      pointer: { pubkey: 'b861f0e0f8a4031caa77da923f41d04802485184974746b833f67cdce030d0ce' },
      start: 0,
      end: 69,
    },
    { type: 'text', text: ' check out my profile:', start: 69, end: 91 },
    {
      type: 'reference',
      pointer: { pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245' },
      start: 91,
      end: 160,
    },
    { type: 'text', text: '; and this cool image ', start: 160, end: 182 },
    { type: 'image', url: 'https://images.com/image.jpg', start: 182, end: 210 },
  ])
})

test('second: parse content with 3 urls of different types', () => {
  const content = `:wss://oa.ao/a/; this was a relay and now here's a video -> https://videos.com/video.mp4! and some music:
http://music.com/song.mp3
and a regular link: https://regular.com/page?ok=true. and now a broken link: https://kjxkxk and a broken nostr ref: nostr:nevent1qqsr0f9w78uyy09qwmjt0kv63j4l7sxahq33725lqyyp79whlfjurwspz4mhxue69uhh56nzv34hxcfwv9ehw6nyddhq0ag9xg and a fake nostr ref: nostr:llll ok but finally https://ok.com!`
  const blocks = Array.from(parse(content))

  expect(blocks).toEqual([
    { type: 'text', text: ':', start: 0, end: 1 },
    { type: 'relay', url: 'wss://oa.ao/a/', start: 1, end: 15 },
    { type: 'text', text: "; this was a relay and now here's a video -> ", start: 15, end: 60 },
    { type: 'video', url: 'https://videos.com/video.mp4', start: 60, end: 88 },
    { type: 'text', text: '! and some music:\n', start: 88, end: 106 },
    { type: 'audio', url: 'http://music.com/song.mp3', start: 106, end: 131 },
    { type: 'text', text: '\nand a regular link: ', start: 131, end: 152 },
    { type: 'url', url: 'https://regular.com/page?ok=true', start: 152, end: 184 },
    {
      type: 'text',
      text: '. and now a broken link: https://kjxkxk and a broken nostr ref: nostr:nevent1qqsr0f9w78uyy09qwmjt0kv63j4l7sxahq33725lqyyp79whlfjurwspz4mhxue69uhh56nzv34hxcfwv9ehw6nyddhq0ag9xg and a fake nostr ref: nostr:llll ok but finally ',
      start: 184,
      end: 408,
    },
    { type: 'url', url: 'https://ok.com/', start: 408, end: 422 },
    { type: 'text', text: '!', start: 422, end: 423 },
  ])
})

test('third: parse complex content with 4 nostr uris and 3 urls', () => {
  const content = `Look at these profiles nostr:npub1xtscya34g58tk0z605fvr788k263gsu6cy9x0mhnm87echrgufzsevkk5s nostr:nprofile1qqs8z4gwdjp6jwqlxhzk35dgpcgl50swljtal58q796f9ghdkexr02gppamhxue69uhhzamfv46jucm0d574e4uy check this event nostr:nevent1qqsr0f9w78uyy09qwmjt0kv63j4l7sxahq33725lqyyp79whlfjurwspz4mhxue69uhh56nzv34hxcfwv9ehw6nyddhq0ag9xl
    here's an image https://example.com/pic.png and another profile nostr:npub1xtscya34g58tk0z605fvr788k263gsu6cy9x0mhnm87echrgufzsevkk5s
    with a video https://example.com/vid.webm and finally https://example.com/docs`
  const blocks = Array.from(parse(content))

  expect(blocks).toEqual([
    { type: 'text', text: 'Look at these profiles ', start: 0, end: 23 },
    {
      type: 'reference',
      pointer: { pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245' },
      start: 23,
      end: 92,
    },
    { type: 'text', text: ' ', start: 92, end: 93 },
    {
      type: 'reference',
      pointer: {
        pubkey: '71550e6c83a9381f35c568d1a80e11fa3e0efc97dfd0e0f17492a2edb64c37a9',
        relays: ['wss://qwieu.com'],
      },
      start: 93,
      end: 196,
    },
    { type: 'text', text: ' check this event ', start: 196, end: 214 },
    {
      type: 'reference',
      pointer: {
        id: '37a4aef1f8423ca076e4b7d99a8cabff40ddb8231f2a9f01081f15d7fa65c1ba',
        relays: ['wss://zjbdksa.aswjdkn'],
        author: undefined,
        kind: undefined,
      },
      start: 214,
      end: 325,
    },
    { type: 'text', text: "\n    here's an image ", start: 325, end: 346 },
    { type: 'image', url: 'https://example.com/pic.png', start: 346, end: 373 },
    { type: 'text', text: ' and another profile ', start: 373, end: 394 },
    {
      type: 'reference',
      pointer: { pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245' },
      start: 394,
      end: 463,
    },
    { type: 'text', text: '\n    with a video ', start: 463, end: 481 },
    { type: 'video', url: 'https://example.com/vid.webm', start: 481, end: 509 },
    { type: 'text', text: ' and finally ', start: 509, end: 522 },
    { type: 'url', url: 'https://example.com/docs', start: 522, end: 546 },
  ])
})

test('parse content with hashtags and emoji shortcodes', () => {
  const event: NostrEvent = {
    kind: 1,
    tags: [
      ['emoji', 'star', 'https://example.com/star.png'],
      ['emoji', 'alpaca', 'https://example.com/alpaca.png'],
    ],
    content:
      'hey nostr:npub1hpslpc8c5sp3e2nhm2fr7swsfqpys5vyjar5dwpn7e7decps6r8qkcln63 check out :alpaca::alpaca: #alpaca at wss://alpaca.com! :star:\n\n#WORDS #486 5/6',
    created_at: 1234567890,
    pubkey: 'dummy',
    id: 'dummy',
    sig: 'dummy',
  }
  const blocks = Array.from(parse(event))

  expect(blocks).toEqual([
    { type: 'text', text: 'hey ', start: 0, end: 4 },
    {
      type: 'reference',
      pointer: { pubkey: 'b861f0e0f8a4031caa77da923f41d04802485184974746b833f67cdce030d0ce' },
      start: 4,
      end: 73,
    },
    { type: 'text', text: ' check out ', start: 73, end: 84 },
    { type: 'emoji', shortcode: 'alpaca', url: 'https://example.com/alpaca.png', start: 84, end: 92 },
    { type: 'emoji', shortcode: 'alpaca', url: 'https://example.com/alpaca.png', start: 92, end: 100 },
    { type: 'text', text: ' ', start: 100, end: 101 },
    { type: 'hashtag', value: 'alpaca', start: 101, end: 108 },
    { type: 'text', text: ' at ', start: 108, end: 112 },
    { type: 'relay', url: 'wss://alpaca.com/', start: 112, end: 128 },
    { type: 'text', text: '! ', start: 128, end: 130 },
    { type: 'emoji', shortcode: 'star', url: 'https://example.com/star.png', start: 130, end: 136 },
    { type: 'text', text: '\n\n', start: 136, end: 138 },
    { type: 'hashtag', value: 'WORDS', start: 138, end: 144 },
    { type: 'text', text: ' ', start: 144, end: 145 },
    { type: 'hashtag', value: '486', start: 145, end: 149 },
    { type: 'text', text: ' 5/6', start: 149, end: 153 },
  ])
})

test('emoji shortcodes are treated as text if no event tags', () => {
  const blocks = Array.from(parse('hello :alpaca:'))

  expect(blocks).toEqual([{ type: 'text', text: 'hello :alpaca:', start: 0, end: 14 }])
})

test("a thing that didn't work well in the wild", () => {
  const blocks = Array.from(
    parse(
      `Crowdsourcing doesn't mean just users clicking, by the way (although that could be possible too), it means a bunch of machines competing: https://leaderboard.sbstats.uk/`,
    ),
  )
  expect(blocks).toEqual([
    {
      type: 'text',
      text: `Crowdsourcing doesn't mean just users clicking, by the way (although that could be possible too), it means a bunch of machines competing: `,
      start: 0,
      end: 138,
    },
    { type: 'url', url: 'https://leaderboard.sbstats.uk/', start: 138, end: 169 },
  ])
})
