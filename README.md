# nostr-tools

Tools for developing [Nostr](https://github.com/fiatjaf/nostr) clients.

## Usage

### Generating a private key and a public key

```js
import { generatePrivateKey, getPublicKey } from 'nostr-tools'

let sk = generatePrivateKey() # `sk` is a hex string
let pk = getPublicKey(sk) # `pk` is a hex string
```

### Creating, signing and verifying events

```js
const {
  validateEvent,
  verifySignature,
  signEvent,
  getEventHash,
  getPublicKey
} = require('./cjs')

let event = {
  kind: 1,
  created_at: Math.floor(Date.now() / 1000),
  tags: [],
  content: 'hello'
}

event.id = getEventHash(event.id)
event.pubkey = getPublicKey(privateKey)
event.sig = await signEvent(event, privateKey)

let ok = validateEvent(event)
let veryOk = await verifySignature(event)
```

### Validating events received from relays

```js
const {matchFilters} = require('./cjs')

let event = {kind: 1, pubkey: 'abcdef...', ...otherProperties}
let ok = matchFilters(
  [
    {
      kinds: [0, 1, 3, 6],
      authors: ['abcdef...', '123456...']
    }
  ],
  event
)
```

### Encrypting and decrypting direct messages

```js
const {nip04, getPublicKey, generatePrivateKey} = require('./cjs')

// sender
let sk1 = generatePrivateKey()
let pk1 = getPublicKey(sk1)

// receiver
let sk2 = generatePrivateKey()
let pk2 = getPublicKey(sk2)

// on the sender side
let message = 'hello'
let ciphertext = nip04.encrypt(sk1, pk2, 'hello')

let event = {
  kind: 4,
  pubkey: pk1,
  tags: [['p', pk2]],
  content: ciphertext,
  ...otherProperties
}

sendEvent(event)

// on the receiver side

sub.on('event', (event) => {
  let sender = event.tags.find(([k, v]) => k === 'p' && && v && v !== '')[1]
  pk1 === sender
  let plaintext = nip04.decrypt(sk2, pk1, event.content)
})
```

Please consult the tests or [the source code](https://github.com/fiatjaf/nostr-tools) for more information that isn't available here.

### Using from the browser (if you don't want to use a bundler)

```html
<script src="https://unpkg.com/nostr-tools/standalone/index.js"></script>
<script>
  window.NostrTools.generatePrivateKey('...') // and so on
</script>
```

## License

Public domain.
