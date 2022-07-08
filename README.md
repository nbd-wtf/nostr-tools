# nostr-tools

Tools for developing [Nostr](https://github.com/fiatjaf/nostr) clients.

## Usage

```js
import {relayPool} from 'nostr-tools'

const pool = relayPool()

pool.setPrivateKey('<hex>') // optional

pool.addRelay('ws://some.relay.com', {read: true, write: true})
pool.addRelay('ws://other.relay.cool', {read: true, write: true})

// example callback function for a subscription
function onEvent(event, relay) {
  console.log(`got an event from ${relay.url} which is already validated.`, event)
}

// subscribing to a single user
// author is the user's public key
pool.sub({cb: onEvent, filter: {author: '<hex>'}})

//  or bulk follow
pool.sub({cb:(event, relay) => {...}, filter: {authors: ['<hex1>', '<hex2>', ..., '<hexn>']}})

// reuse a subscription channel
const mySubscription = pool.sub({cb: ..., filter: ....})
mySubscription.sub({filter: ....})
mySubscription.sub({cb: ...})
mySubscription.unsub()

// get specific event
const specificChannel = pool.sub({
  cb: (event, relay) => {
    console.log('got specific event from relay', event, relay)
    specificChannel.unsub()
  },
  filter: {id: '<hex>'}
})

// or get a specific event plus all the events that reference it in the 'e' tag
pool.sub({ cb: (event, relay) => { ... }, filter: [{id: '<hex>'}, {'#e': '<hex>'}] })

// get all events
pool.sub({cb: (event, relay) => {...}, filter: {}})

// get recent events
pool.sub({cb: (event, relay) => {...}, filter: {since: timestamp}})

// publishing events(inside an async function):
const ev = await pool.publish(eventObject, (status, url) => {
  if (status === 0) {
    console.log(`publish request sent to ${url}`)
  }
  if (status === 1) {
    console.log(`event published by ${url}`, ev)
  }
})
// it will be signed automatically with the key supplied above
// or pass an already signed event to bypass this

// subscribing to a new relay
pool.addRelay('<url>')
// will automatically subscribe to the all the events called with .sub above
```

All functions expect bytearrays as hex strings and output bytearrays as hex strings.

For other utils please read the source (for now).

### Using from the browser (if you don't want to use a bundler)

You can import nostr-tools as an ES module. Just add a script tag like this:

```html
<script type="module">
  import {generatePrivateKey} from 'https://unpkg.com/nostr-tools/nostr.js'
  console.log(generatePrivateKey())
</script>
```

And import whatever function you would import from `"nostr-tools"` in a bundler.

## TypeScript

This module has hand-authored TypeScript declarations. `npm run check-ts` will run a lint-check script to ensure the typings can be loaded and call at least a few standard library functions. It's not at all comprehensive and likely to contain bugs. Issues welcome; tag @rcoder as needed.

## License

Public domain.
