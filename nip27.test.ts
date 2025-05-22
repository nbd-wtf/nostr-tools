import { test, expect } from 'bun:test'
import { parse } from './nip27.ts'

test('first: parse simple content with 1 url and 1 nostr uri', () => {
  const content = `nostr:npub1hpslpc8c5sp3e2nhm2fr7swsfqpys5vyjar5dwpn7e7decps6r8qkcln63 check out my profile:nostr:npub1xtscya34g58tk0z605fvr788k263gsu6cy9x0mhnm87echrgufzsevkk5s; and this cool image https://images.com/image.jpg`
  const blocks = Array.from(parse(content))

  expect(blocks).toEqual([
    { type: 'reference', pointer: { pubkey: 'b861f0e0f8a4031caa77da923f41d04802485184974746b833f67cdce030d0ce' } },
    { type: 'text', text: ' check out my profile:' },
    { type: 'reference', pointer: { pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245' } },
    { type: 'text', text: '; and this cool image ' },
    { type: 'image', url: 'https://images.com/image.jpg' },
  ])
})

test('second: parse content with 3 urls of different types', () => {
  const content = `:wss://oa.ao; this was a relay and now here's a video -> https://videos.com/video.mp4! and some music:
http://music.com/song.mp3
and a regular link: https://regular.com/page?ok=true. and now a broken link: https://kjxkxk and a broken nostr ref: nostr:nevent1qqsr0f9w78uyy09qwmjt0kv63j4l7sxahq33725lqyyp79whlfjurwspz4mhxue69uhh56nzv34hxcfwv9ehw6nyddhq0ag9xg and a fake nostr ref: nostr:llll ok but finally https://ok.com!`
  const blocks = Array.from(parse(content))

  expect(blocks).toEqual([
    { type: 'text', text: ':' },
    { type: 'relay', url: 'wss://oa.ao/' },
    { type: 'text', text: "; this was a relay and now here's a video -> " },
    { type: 'video', url: 'https://videos.com/video.mp4' },
    { type: 'text', text: '! and some music:\n' },
    { type: 'audio', url: 'http://music.com/song.mp3' },
    { type: 'text', text: '\nand a regular link: ' },
    { type: 'url', url: 'https://regular.com/page?ok=true' },
    {
      type: 'text',
      text: '. and now a broken link: https://kjxkxk and a broken nostr ref: nostr:nevent1qqsr0f9w78uyy09qwmjt0kv63j4l7sxahq33725lqyyp79whlfjurwspz4mhxue69uhh56nzv34hxcfwv9ehw6nyddhq0ag9xg and a fake nostr ref: nostr:llll ok but finally ',
    },
    { type: 'url', url: 'https://ok.com/' },
    { type: 'text', text: '!' },
  ])
})

test('third: parse complex content with 4 nostr uris and 3 urls', () => {
  const content = `Look at these profiles nostr:npub1xtscya34g58tk0z605fvr788k263gsu6cy9x0mhnm87echrgufzsevkk5s nostr:nprofile1qqs8z4gwdjp6jwqlxhzk35dgpcgl50swljtal58q796f9ghdkexr02gppamhxue69uhhzamfv46jucm0d574e4uy check this event nostr:nevent1qqsr0f9w78uyy09qwmjt0kv63j4l7sxahq33725lqyyp79whlfjurwspz4mhxue69uhh56nzv34hxcfwv9ehw6nyddhq0ag9xl
    here's an image https://example.com/pic.png and another profile nostr:npub1xtscya34g58tk0z605fvr788k263gsu6cy9x0mhnm87echrgufzsevkk5s
    with a video https://example.com/vid.webm and finally https://example.com/docs`
  const blocks = Array.from(parse(content))

  expect(blocks).toEqual([
    { type: 'text', text: 'Look at these profiles ' },
    { type: 'reference', pointer: { pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245' } },
    { type: 'text', text: ' ' },
    {
      type: 'reference',
      pointer: {
        pubkey: '71550e6c83a9381f35c568d1a80e11fa3e0efc97dfd0e0f17492a2edb64c37a9',
        relays: ['wss://qwieu.com'],
      },
    },
    { type: 'text', text: ' check this event ' },
    {
      type: 'reference',
      pointer: {
        id: '37a4aef1f8423ca076e4b7d99a8cabff40ddb8231f2a9f01081f15d7fa65c1ba',
        relays: ['wss://zjbdksa.aswjdkn'],
        author: undefined,
        kind: undefined,
      },
    },
    { type: 'text', text: "\n    here's an image " },
    { type: 'image', url: 'https://example.com/pic.png' },
    { type: 'text', text: ' and another profile ' },
    { type: 'reference', pointer: { pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245' } },
    { type: 'text', text: '\n    with a video ' },
    { type: 'video', url: 'https://example.com/vid.webm' },
    { type: 'text', text: ' and finally ' },
    { type: 'url', url: 'https://example.com/docs' },
  ])
})
