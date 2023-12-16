import { test, expect } from 'bun:test'
import { parseReferences } from './references.ts'
import { buildEvent } from './test-helpers.ts'

test('parse mentions', () => {
  let evt = buildEvent({
    tags: [
      ['p', 'c9d556c6d3978d112d30616d0d20aaa81410e3653911dd67787b5aaf9b36ade8', 'wss://nostr.com'],
      ['e', 'a84c5de86efc2ec2cff7bad077c4171e09146b633b7ad117fffe088d9579ac33', 'wss://other.com', 'reply'],
      ['e', '31d7c2875b5fc8e6f9c8f9dc1f84de1b6b91d1947ea4c59225e55c325d330fa8', ''],
    ],
    content:
      'hello #[0], have you seen #[2]? it was made by nostr:nprofile1qqsvc6ulagpn7kwrcwdqgp797xl7usumqa6s3kgcelwq6m75x8fe8yc5usxdg on nostr:nevent1qqsvc6ulagpn7kwrcwdqgp797xl7usumqa6s3kgcelwq6m75x8fe8ychxp5v4! broken #[3]',
  })

  expect(parseReferences(evt)).toEqual([
    {
      text: '#[0]',
      profile: {
        pubkey: 'c9d556c6d3978d112d30616d0d20aaa81410e3653911dd67787b5aaf9b36ade8',
        relays: ['wss://nostr.com'],
      },
    },
    {
      text: '#[2]',
      event: {
        id: '31d7c2875b5fc8e6f9c8f9dc1f84de1b6b91d1947ea4c59225e55c325d330fa8',
        relays: [],
      },
    },
    {
      text: 'nostr:nprofile1qqsvc6ulagpn7kwrcwdqgp797xl7usumqa6s3kgcelwq6m75x8fe8yc5usxdg',
      profile: {
        pubkey: 'cc6b9fea033f59c3c39a0407c5f1bfee439b077508d918cfdc0d6fd431d39393',
        relays: [],
      },
    },
    {
      text: 'nostr:nevent1qqsvc6ulagpn7kwrcwdqgp797xl7usumqa6s3kgcelwq6m75x8fe8ychxp5v4',
      event: {
        id: 'cc6b9fea033f59c3c39a0407c5f1bfee439b077508d918cfdc0d6fd431d39393',
        relays: [],
        author: undefined,
      },
    },
  ])
})
