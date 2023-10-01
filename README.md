# nostr-tools

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
import { generatePrivateKey, getPublicKey } from 'nostr-tools'

let sk = generatePrivateKey() // `sk` is a hex string
let pk = getPublicKey(sk) // `pk` is a hex string
```

### Creating, signing and verifying events

```js
import { validateEvent, verifySignature, getSignature, getEventHash, getPublicKey } from 'nostr-tools'

let event = {
  kind: 1,
  created_at: Math.floor(Date.now() / 1000),
  tags: [],
  content: 'hello',
  pubkey: getPublicKey(privateKey),
}

event.id = getEventHash(event)
event.sig = getSignature(event, privateKey)

let ok = validateEvent(event)
let veryOk = verifySignature(event)
```

### Interacting with a relay

```js
import { relayInit, finishEvent, generatePrivateKey, getPublicKey } from 'nostr-tools'

const relay = relayInit('wss://relay.example.com')
relay.on('connect', () => {
  console.log(`connected to ${relay.url}`)
})
relay.on('error', () => {
  console.log(`failed to connect to ${relay.url}`)
})

await relay.connect()

// let's query for an event that exists
let sub = relay.sub([
  {
    ids: ['d7dd5eb3ab747e16f8d0212d53032ea2a7cadef53837e5a6c66d42849fcb9027'],
  },
])
sub.on('event', event => {
  console.log('we got the event we wanted:', event)
})
sub.on('eose', () => {
  sub.unsub()
})

// let's publish a new event while simultaneously monitoring the relay for it
let sk = generatePrivateKey()
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
const signedEvent = finishEvent(event, sk)
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

let sub = pool.sub(
  [...relays, 'wss://relay.example3.com'],
  [
    {
      authors: ['32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245'],
    },
  ],
)

sub.on('event', event => {
  // this will only be called once the first time the event is received
  // ...
})

let pubs = pool.publish(relays, newEvent)
await Promise.all(pubs)

let events = await pool.list(relays, [{ kinds: [0, 1] }])
let event = await pool.get(relays, {
  ids: ['44e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245'],
})

let batchedEvents = await pool.batchedList('notes', relays, [{ kinds: [1] }])
// `batchedList` will wait for other function calls with the same `batchKey`
// (e.g. 'notes', 'authors', etc) within a fixed amount of time (default: `100ms`) before sending
// next ws request, and batch all requests with similar `batchKey`s together in a single request.

let relaysForEvent = pool.seenOn('44e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245')
// relaysForEvent will be an array of URLs from relays a given event was seen on

pool.close()
```

read more details about `batchedList` on this pr: [https://github.com/nbd-wtf/nostr-tools/pull/279](https://github.com/nbd-wtf/nostr-tools/pull/279#issue-1859315757)

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
import { nip19, generatePrivateKey, getPublicKey } from 'nostr-tools'

let sk = generatePrivateKey()
let nsec = nip19.nsecEncode(sk)
let { type, data } = nip19.decode(nsec)
assert(type === 'nsec')
assert(data === sk)

let pk = getPublicKey(generatePrivateKey())
let npub = nip19.npubEncode(pk)
let { type, data } = nip19.decode(npub)
assert(type === 'npub')
assert(data === pk)

let pk = getPublicKey(generatePrivateKey())
let relays = ['wss://relay.nostr.example.mydomain.example.com', 'wss://nostr.banana.com']
let nprofile = nip19.nprofileEncode({ pubkey: pk, relays })
let { type, data } = nip19.decode(nprofile)
assert(type === 'nprofile')
assert(data.pubkey === pk)
assert(data.relays.length === 2)
```

### Encrypting and decrypting direct messages

```js
import {nip44, getPublicKey, generatePrivateKey} from 'nostr-tools'

// sender
let sk1 = generatePrivateKey()
let pk1 = getPublicKey(sk1)

// receiver
let sk2 = generatePrivateKey()
let pk2 = getPublicKey(sk2)

// on the sender side
let message = 'hello'
let key = nip44.getSharedSecret(sk1, pk2)
let ciphertext = nip44.encrypt(key, message)

let event = {
  kind: 4,
  pubkey: pk1,
  tags: [['p', pk2]],
  content: ciphertext,
  ...otherProperties,
}

sendEvent(event)

// on the receiver side
sub.on('event', async event => {
  let sender = event.pubkey
  // pk1 === sender
  let _key = nip44.getSharedSecret(sk2, pk1)
  let plaintext = nip44.decrypt(_key, event.content)
})
```

### Performing and checking for delegation

```js
import { nip26, getPublicKey, generatePrivateKey } from 'nostr-tools'

// delegator
let sk1 = generatePrivateKey()
let pk1 = getPublicKey(sk1)

// delegatee
let sk2 = generatePrivateKey()
let pk2 = getPublicKey(sk2)

// generate delegation
let delegation = nip26.createDelegation(sk1, {
  pubkey: pk2,
  kind: 1,
  since: Math.round(Date.now() / 1000),
  until: Math.round(Date.now() / 1000) + 60 * 60 * 24 * 30 /* 30 days */,
})

// the delegatee uses the delegation when building an event
let event = {
  pubkey: pk2,
  kind: 1,
  created_at: Math.round(Date.now() / 1000),
  content: 'hello from a delegated key',
  tags: [['delegation', delegation.from, delegation.cond, delegation.sig]],
}

// finally any receiver of this event can check for the presence of a valid delegation tag
let delegator = nip26.getDelegator(event)
assert(delegator === pk1) // will be null if there is no delegation tag or if it is invalid
```

Please consult the tests or [the source code](https://github.com/fiatjaf/nostr-tools) for more information that isn't available here.

### Using from the browser (if you don't want to use a bundler)

```html
<script src="https://unpkg.com/nostr-tools/lib/nostr.bundle.js"></script>
<script>
  window.NostrTools.generatePrivateKey('...') // and so on
</script>
```

## Plumbing

1. Install [`just`](https://just.systems/)
2. `just -l`

## License

This is free and unencumbered software released into the public domain. By submitting patches to this project, you agree to dedicate any and all copyright interest in this software to the public domain.
