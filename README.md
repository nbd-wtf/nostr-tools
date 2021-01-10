# nostr-tools

Tools for developing [Nostr](https://github.com/fiatjaf/nostr) clients.

## Usage

```js
import {relayPool} from 'nostr-tools'

const pool = relayPool()

pool.setPrivateKey('<hex>') // optional

pool.addRelay('ws://some.relay.com', {read: true, write: true})
pool.addRelay('ws://other.relay.cool', {read: true, write: true})

pool.onEvent((event, context, relay) => {
  console.log(`got a relay with context ${context} from ${relay.url} which is already validated.`, event)
})

// subscribing to users and requesting specific users or events:
pool.subKey('<hex>')
pool.subKey('<hex>')
pool.subKey('<hex>')
pool.reqFeed()
pool.reqEvent({id: '<hex>'})
pool.reqKey({key: '<hex>'})
// upon request the events will be received on .onEvent above

// publishing events:
pool.publish(<event object>)
// it will be signed automatically with the key supplied above
// or pass an already signed event to bypass this

// subscribing to a new relay
pool.addRelay('<url>')
// will automatically subscribe to the all the keys called with .subKey above
```

For other utils please read the source (for now).
