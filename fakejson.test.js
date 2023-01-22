/* eslint-env jest */

const {fj} = require('./lib/nostr.cjs')

test('match id', () => {
  expect(
    fj.matchEventId(
      `["EVENT","nostril-query",{"tags":[],"content":"so did we cut all corners and p2p stuff in order to make a decentralized social network that was fast and worked, but in the end what we got was a lot of very slow clients that can't handle the traffic of one jack dorsey tweet?","sig":"ca62629d189edebb8f0811cfa0ac53015013df5f305dcba3f411ba15cfc4074d8c2d517ee7d9e81c9eb72a7328bfbe31c9122156397565ac55e740404e2b1fe7","id":"fef2a50f7d9d3d5a5f38ee761bc087ec16198d3f0140df6d1e8193abf7c2b146","kind":1,"pubkey":"3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d","created_at":1671150419}]`,
      'fef2a50f7d9d3d5a5f38ee761bc087ec16198d3f0140df6d1e8193abf7c2b146'
    )
  ).toBeTruthy()

  expect(
    fj.matchEventId(
      `["EVENT","nostril-query",{"content":"a bunch of mfs interacted with my post using what I assume were \"likes\": https://nostr.build/i/964.png","created_at":1672506879,"id":"f40bdd0905137ad60482537e260890ab50b0863bf16e67cf9383f203bd26c96f","kind":1,"pubkey":"3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d","sig":"8b825d2d4096f0643b18ca39da59ec07a682cd8a3e717f119c845037573d98099f5bea94ec7ddedd5600c8020144a255ed52882a911f7f7ada6d6abb3c0a1eb4","tags":[]}]`,
      'fef2a50f7d9d3d5a5f38ee761bc087ec16198d3f0140df6d1e8193abf7c2b146'
    )
  ).toBeFalsy()
})

test('match kind', () => {
  expect(
    fj.matchEventKind(
      `["EVENT","nostril-query",{"tags":[],"content":"so did we cut all corners and p2p stuff in order to make a decentralized social network that was fast and worked, but in the end what we got was a lot of very slow clients that can't handle the traffic of one jack dorsey tweet?","sig":"ca62629d189edebb8f0811cfa0ac53015013df5f305dcba3f411ba15cfc4074d8c2d517ee7d9e81c9eb72a7328bfbe31c9122156397565ac55e740404e2b1fe7","id":"fef2a50f7d9d3d5a5f38ee761bc087ec16198d3f0140df6d1e8193abf7c2b146","kind":1,"pubkey":"3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d","created_at":1671150419}]`,
      1
    )
  ).toBeTruthy()

  expect(
    fj.matchEventKind(
      `["EVENT","nostril-query",{"content":"{\"name\":\"fiatjaf\",\"about\":\"buy my merch at fiatjaf store\",\"picture\":\"https://fiatjaf.com/static/favicon.jpg\",\"nip05\":\"_@fiatjaf.com\"}","created_at":1671217411,"id":"b52f93f6dfecf9d81f59062827cd941412a0e8398dda60baf960b17499b88900","kind":12720,"pubkey":"3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d","sig":"fc1ea5d45fa5ed0526faed06e8fc7a558e60d1b213e9714f440828584ee999b93407092f9b04deea7e504fa034fc0428f31f7f0f95417b3280ebe6004b80b470","tags":[]}]`,
      12720
    )
  ).toBeTruthy()
})
