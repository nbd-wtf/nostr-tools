/**
Path API for Nostr, built on NIP33 replaceable-by-tag events of kind 30000.

```
const path = new Path(myPublishFn, mySubscribeFn, myUnsubscribeFn, { authors: [myPubKey} })
path.set('reactions/[noteID]', '😎')
path.get('reactions/[noteID]', (value, path, event) => console.log(event.pubkey, 'reacted with', value))
```

TODO:
```
path.list('reactions', (value, path, event) => {
    console.log(
      event.pubkey, 'reacted to', path.slice('/')[1], 'with', value
    )
  }, { authors: myFollows }
)
```

In-memory caches the most recent event for the subscribed path, and only calls back with the most recent value.

This API allows us to build all kinds of applications on top of Nostr (github replacement for example) without having to
specify new event kinds all the time and implement them in all applications and relays.

NIP33: https://github.com/nostr-protocol/nips/blob/master/33.md
 */
import {Filter, matchFilter} from './filter'
import {Event} from './event'

const EVENT_KIND = 30000

type CompleteEvent = Event & {id: string}
type PathCallback = (value: any, path: string, event: Event) => void
type Listener = {
  filter: Filter
  callback: PathCallback
  subscription?: string
  off: () => void
}
type Publish = (event: Partial<Event>) => Promise<Event>
type Subscribe = (filters: Filter[], callback: (event: Event) => void) => string
type Unsubscribe = (id: string) => void
type Encrypt = (content: string) => Promise<string>
type Decrypt = (content: string) => Promise<string>

export function getEventPath(event: Event): string | undefined {
  return event.tags.find(([t]) => t === 'd')?.[1]
}

export function getFilterPath(filter: Filter): string | undefined {
  return filter['#d']?.[0]
}

// We can later add other storages like IndexedDB or localStorage
class MemoryStorage {
  eventsByPathAndAuthor = new Map<string, Map<string, Event>>()

  // returns a boolean indicating whether the event was added (newer than existing)
  set(event: Event): boolean {
    const path = getEventPath(event)
    if (!path) {
      throw new Error(`event has no d tag: ${JSON.stringify(event)}`)
    }
    if (!this.eventsByPathAndAuthor.has(path)) {
      this.eventsByPathAndAuthor.set(path, new Map())
    }
    let valuesByAuthor = this.eventsByPathAndAuthor.get(path)
    if (!valuesByAuthor) {
      valuesByAuthor = new Map()
      this.eventsByPathAndAuthor.set(path, valuesByAuthor)
    }
    const existing = valuesByAuthor?.get(event.pubkey)
    if (existing && existing.created_at > event.created_at) {
      return false
    }
    valuesByAuthor.set(event.pubkey, event)
    return true
  }

  get(filter: Filter, callback: (event: Event) => void) {
    const path = getFilterPath(filter)
    if (!path) {
      throw new Error(`filter has no #d tag: ${JSON.stringify(filter)}`)
    }
    const valuesByAuthor = this.eventsByPathAndAuthor.get(path)
    if (!valuesByAuthor) {
      return
    }
    for (let [author, event] of valuesByAuthor) {
      if (!filter.authors || filter.authors.indexOf(author) !== -1) {
        callback(event)
      }
    }
  }
}

export class Path {
  store: MemoryStorage
  listeners: Map<string, Listener>
  publish: Publish
  subscribe: Subscribe
  unsubscribe: Unsubscribe
  filter: Filter
  encrypt?: Encrypt
  decrypt?: Decrypt

  constructor(publish: Publish, subscribe: Subscribe, unsubscribe: Unsubscribe, filter: Filter, encrypt?: Encrypt, decrypt?: Decrypt) {
    this.publish = publish
    this.subscribe = subscribe
    this.unsubscribe = unsubscribe
    this.filter = filter
    this.encrypt = encrypt
    this.decrypt = decrypt
    this.store = new MemoryStorage()
    this.listeners = new Map<string, Listener>()
  }

  async publishSetEvent(path: string, value: any): Promise<Event> {
    let content: string
    if (this.encrypt) {
      // TODO: path should be deterministically encrypted hash(path + secret) but NIP07 provides no way for that
      const contentStr = JSON.stringify(value)
      content = await this.encrypt(contentStr)
      if (contentStr === content) {
        throw new Error(`Encryption failed: ${contentStr} === ${content}`)
      }
    } else {
      content = JSON.stringify(value)
    }
    return this.publish({
      kind: EVENT_KIND,
      tags: [['d', path]],
      content,
      created_at: Math.floor(Date.now() / 1000),
    })
  }

  async set(path: string, value: any): Promise<boolean> {
    try {
      const event = await this.publishSetEvent(path, value)
      if (event) {
        if (this.store.set(event)) {
          this.notifyListeners(event as CompleteEvent)
        }
        return true
      }
    } catch (e) {
      console.error(e)
    }
    return false
  }

  async getEventValue(event: Event): Promise<any> {
    let value = this.decrypt ? await this.decrypt(event.content) : event.content
    try {
      value = JSON.parse(value)
    } catch (e) {
      throw new Error(`Failed to parse event content: ${value}`)
    }
    return value
  }

  get(path: string, callback: PathCallback, filter = {}): Listener {
    filter = Object.assign({}, filter, this.filter, { '#d': [path], kinds: [EVENT_KIND] })
    const listener = this.addListener(filter, callback)
    this.store.get(filter, (event) => this.callbackFromEvent(event, callback))
    this.subscribe([filter], async (event) => {
      if (this.store.set(event)) {
        this.notifyListeners(event as CompleteEvent)
      }
    })
    return listener
  }

  addListener(filter: Filter, callback: PathCallback): Listener {
    const id = Math.random().toString(36).substr(2, 9)
    const listener: Listener = { filter, callback, off: () => {
      this.listeners.delete(id)
      if (listener.subscription) {
        this.unsubscribe(listener.subscription)
      }
    }}
    this.listeners.set(id, listener)
    return listener
  }

  removeListener(id: string) {
    const listener = this.listeners.get(id)
    if (listener) {
      listener.off()
    }
  }

  callbackFromEvent(event: Event, callback: PathCallback) {
    const path = getEventPath(event)
    if (!path) {
      throw new Error(`event has no d tag: ${JSON.stringify(event)}`)
    }
    this.getEventValue(event).then((value) => {
      callback(value, path, event)
    })
  }

  async notifyListeners(event: CompleteEvent) {
    for (let listener of this.listeners.values()) {
      if (matchFilter(listener.filter, event)) {
        this.callbackFromEvent(event, listener.callback)
      }
    }
  }
}
