# ![](https://img.shields.io/github/actions/workflow/status/nbd-wtf/nostr-tools/test.yml) nostr-tools

Tools for developing [Nostr](https://github.com/fiatjaf/nostr) clients.

Only depends on _@scure_ and _@noble_ packages.

This package is only providing lower-level functionality. If you want an easy-to-use fully-fledged solution that abstracts the hard parts of Nostr and makes decisions on your behalf, take a look at [NDK](https://github.com/nostr-dev-kit/ndk) and [@snort/system](https://www.npmjs.com/package/@snort/system).

## Installation

```bash
 npm install nostr-tools # or yarn add nostr-tools
```

If using TypeScript, this package requires TypeScript >= 5.0.

## Usage

### Generating a private key and a public key

```js
import { generateSecretKey, getPublicKey } from 'nostr-tools'

let sk = generateSecretKey() // `sk` is a Uint8Array
let pk = getPublicKey(sk) // `pk` is a hex string
```

### Creating, signing and verifying events

```js
import { finalizeEvent, verifyEvent } from 'nostr-tools'

let event = finalizeEvent({
  kind: 1,
  created_at: Math.floor(Date.now() / 1000),
  tags: [],
  content: 'hello',
}, sk)

let isGood = verifyEvent(event)
```

### Interacting with a relay

```js
import { Relay, finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools'

const relay = await Relay.connect('wss://relay.example.com')
console.log(`connected to ${relay.url}`)

// let's query for an event that exists
const sub = relay.subscribe([
  {
    ids: ['d7dd5eb3ab747e16f8d0212d53032ea2a7cadef53837e5a6c66d42849fcb9027'],
  },
], {
  onevent(event) {
    console.log('we got the event we wanted:', event)
  },
  oneose() {
    sub.close()
  }
})

// let's publish a new event while simultaneously monitoring the relay for it
let sk = generateSecretKey()
let pk = getPublicKey(sk)

let sub = relay.sub([
  {
    kinds: [1],
    authors: [pk],
  },
])

sub.on('event', event => {
  console.log('got event:', event)
})

let event = {
  kind: 1,
  created_at: Math.floor(Date.now() / 1000),
  tags: [],
  content: 'hello world',
}

// this assigns the pubkey, calculates the event id and signs the event in a single step
const signedEvent = finalizeEvent(event, sk)
await relay.publish(signedEvent)

let events = await relay.list([{ kinds: [0, 1] }])
let event = await relay.get({
  ids: ['44e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245'],
})

relay.close()
```

To use this on Node.js you first must install `websocket-polyfill` and import it:

```js
import 'websocket-polyfill'
```

### Interacting with multiple relays

```js
import { SimplePool } from 'nostr-tools'

const pool = new SimplePool()

let relays = ['wss://relay.example.com', 'wss://relay.example2.com']

let h = pool.subscribeMany(
  [...relays, 'wss://relay.example3.com'],
  [
    {
      authors: ['32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245'],
    },
  ],
  {
    onevent(event) {
      // this will only be called once the first time the event is received
      // ...
    },
    oneose() {
      h.close()
    }
  }
)

await Promise.any(pool.publish(relays, newEvent))
console.log('published to at least one relay!')

let events = await pool.querySync(relays, [{ kinds: [0, 1] }])
let event = await pool.get(relays, {
  ids: ['44e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245'],
})
```

### Parsing references (mentions) from a content using NIP-10 and NIP-27

```js
import { parseReferences } from 'nostr-tools'

let references = parseReferences(event)
let simpleAugmentedContent = event.content
for (let i = 0; i < references.length; i++) {
  let { text, profile, event, address } = references[i]
  let augmentedReference = profile
    ? `<strong>@${profilesCache[profile.pubkey].name}</strong>`
    : event
    ? `<em>${eventsCache[event.id].content.slice(0, 5)}</em>`
    : address
    ? `<a href="${text}">[link]</a>`
    : text
  simpleAugmentedContent.replaceAll(text, augmentedReference)
}
```

### Querying profile data from a NIP-05 address

```js
import { nip05 } from 'nostr-tools'

let profile = await nip05.queryProfile('jb55.com')
console.log(profile.pubkey)
// prints: 32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245
console.log(profile.relays)
// prints: [wss://relay.damus.io]
```

To use this on Node.js < v18, you first must install `node-fetch@2` and call something like this:

```js
nip05.useFetchImplementation(require('node-fetch'))
```

### Encoding and decoding NIP-19 codes

```js
import { nip19, generateSecretKey, getPublicKey } from 'nostr-tools'

let sk = generateSecretKey()
let nsec = nip19.nsecEncode(sk)
let { type, data } = nip19.decode(nsec)
assert(type === 'nsec')
assert(data === sk)

let pk = getPublicKey(generateSecretKey())
let npub = nip19.npubEncode(pk)
let { type, data } = nip19.decode(npub)
assert(type === 'npub')
assert(data === pk)

let pk = getPublicKey(generateSecretKey())
let relays = ['wss://relay.nostr.example.mydomain.example.com', 'wss://nostr.banana.com']
let nprofile = nip19.nprofileEncode({ pubkey: pk, relays })
let { type, data } = nip19.decode(nprofile)
assert(type === 'nprofile')
assert(data.pubkey === pk)
assert(data.relays.length === 2)
```

## Import modes

### Using just the packages you want

Importing the entirety of `nostr-tools` may bloat your build, so you should probably import individual packages instead:

```js
import { generateSecretKey, finalizeEvent, verifyEvent } from 'nostr-tools/pure'
import { SimplePool } from 'nostr-tools/pool'
import { Relay, Subscription } from 'nostr-tools/relay'
import { matchFilter } from 'nostr-tools/filter'
import { decode, nprofileEncode, neventEncode, npubEncode } from 'nostr-tools/nip19'
// and so on and so forth
```

### Using it with `nostr-wasm`

[`nostr-wasm`](https://github.com/fiatjaf/nostr-wasm) is a thin wrapper over [libsecp256k1](https://github.com/bitcoin-core/secp256k1) compiled to WASM just for hashing, signing and verifying Nostr events.

```js
import { setNostrWasm, generateSecretKey, finalizeEvent, verifyEvent } from 'nostr-tools/wasm'
import { initNostrWasm } from 'nostr-wasm'

// make sure this promise resolves before your app starts calling finalizeEvent or verifyEvent
initNostrWasm().then(setNostrWasm)

// or use 'nostr-wasm/gzipped' or even 'nostr-wasm/headless',
// see https://www.npmjs.com/package/nostr-wasm for options
```

If you're going to use `Relay` and `SimplePool` you must also import `nostr-tools/abstract-relay` and/or `nostr-tools/abstract-pool` instead of the defaults and then instantiate them by passing the `verifyEvent`:

```js
import { setNostrWasm, verifyEvent } from 'nostr-tools/wasm'
import { AbstractRelay } from 'nostr-tools/abstract-relay'
import { AbstractSimplePool } from 'nostr-tools/abstract-pool'
import { initNostrWasm } from 'nostr-wasm'

initNostrWasm().then(setNostrWasm)

const relay = AbstractRelay.connect('wss://relayable.org', { verifyEvent })
const pool = new AbstractSimplePool({ verifyEvent })
```

This may be faster than the pure-JS [noble libraries](https://paulmillr.com/noble/) used by default and in `nostr-tools/pure`. Benchmarks:

```
benchmark      time (avg)             (min … max)       p75       p99      p995
------------------------------------------------- -----------------------------
• relay read message and verify event (many events)
------------------------------------------------- -----------------------------
wasm        34.94 ms/iter   (34.61 ms … 35.73 ms)  35.07 ms  35.73 ms  35.73 ms
pure js     239.7 ms/iter (235.41 ms … 243.69 ms) 240.51 ms 243.69 ms 243.69 ms
trusted    402.71 µs/iter   (344.57 µs … 2.98 ms) 407.39 µs 745.62 µs 812.59 µs

summary for relay read message and verify event
  wasm
   86.77x slower than trusted
   6.86x faster than pure js
```

### Using from the browser (if you don't want to use a bundler)

```html
<script src="https://unpkg.com/nostr-tools/lib/nostr.bundle.js"></script>
<script>
  window.NostrTools.generateSecretKey('...') // and so on
</script>
```

## Plumbing

To develop `nostr-tools`, install [`just`](https://just.systems/) and run `just -l` to see commands available.

## License

This is free and unencumbered software released into the public domain. By submitting patches to this project, you agree to dedicate any and all copyright interest in this software to the public domain.
