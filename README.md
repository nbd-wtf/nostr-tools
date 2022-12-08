# nostr-tools

Tools for developing [Nostr](https://github.com/fiatjaf/nostr) clients.

## Usage

```js
import {relayPool} from 'nostr-tools'

const pool = relayPool()

pool.setPrivateKey('<hex>') // optional

pool.addRelay('ws://some.relay.com', {read: true, write: true})
pool.addRelay('ws://other.relay.cool', {read: true, write: true})

// example callback functions for listeners
// callback functions take an object argument with following keys:
//  - relay: relay url
//  - type: type of listener
//  - id: sub id for sub specific listeners ('EVENT' or 'EOSE')
//  - event: event object, only for 'event' listener
//  - notice: notice message, only for 'notice' listener
function onEvent({event, relay, type, id}) {
  console.log(`got an event from ${relay} which is already validated.`, event)
}
function onEose({relay, type, id}) { /* callback function here */}
function onNotice({relay, type, notice}) { /* callback function here */}
function onConnection({relay, type}) { /* callback function here */}

// listen for messages for pool
pool.on('event', onEvent)
pool.on('connection', onConnection)
pool.on('notice', onNotice)

// subscribing to a single user
// author is the user's public key
pool.sub({filter: {author: '<hex>'}})

//  or bulk follow
pool.sub({filter: {authors: ['<hex1>', '<hex2>', ..., '<hexn>']}})

// reuse a subscription channel
const mySubscription = pool.sub({filter: ...., skipVerification: false, beforeSend: ....})
mySubscription.sub({filter: ....})
mySubscription.sub({skipVerification: true})

// listen for messages for subscription
mySubscription.on('event', onEvent)
mySubscription.on('eose', onEose)

// close subscription
mySubscription.unsub()

// get specific event
const specificChannel = pool.sub({ filter: {id: '<hex>'}})
  .on('event', ({event, relay}) => {
    console.log('got specific event from relay', event, relay)
    specificChannel.unsub()
  })

// or get a specific event plus all the events that reference it in the 'e' tag
pool.sub({ filter: [{id: '<hex>'}, {'#e': '<hex>'}] })

// get all events
pool.sub({ filter: {} })

// get recent events
pool.sub({ filter: {since: timestamp} })

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
