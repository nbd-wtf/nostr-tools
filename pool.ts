import {Relay, relayInit} from './relay'
import {normalizeURL} from './utils'
import {Filter} from './filter'
import {Event} from './event'
import {SubscriptionOptions, Sub, Pub} from './relay'

export class SimplePool {
  private _conn: {[url: string]: Relay}

  constructor(defaultRelays: string[] = []) {
    this._conn = {}
    defaultRelays.forEach(this.ensureRelay)
  }

  ensureRelay(url: string): Relay {
    const nm = normalizeURL(url)
    const existing = this._conn[nm]
    if (existing) return existing

    const relay = relayInit(nm)
    this._conn[nm] = relay

    return relay
  }

  sub(relays: string[], filters: Filter[], opts?: SubscriptionOptions): Sub[] {
    let _knownIds: Set<string> = new Set()
    let modifiedOpts = opts || {}
    modifiedOpts.alreadyHaveEvent = id => _knownIds.has(id)

    return relays.map(relay => {
      let r = this._conn[relay]
      if (!r) return badSub()
      let s = r.sub(filters, modifiedOpts)
      s.on('event', (event: Event) => _knownIds.add(event.id as string))
      return s
    })
  }

  get(
    relays: string[],
    filter: Filter,
    opts?: SubscriptionOptions
  ): Promise<Event | null> {
    return new Promise(resolve => {
      let subs = this.sub(relays, [filter], opts)
      let timeout = setTimeout(() => {
        subs.forEach(sub => sub.unsub(), 1500)
        resolve(null)
      })
      subs.forEach(sub => {
        sub.on('event', (event: Event) => {
          resolve(event)
          clearTimeout(timeout)
          subs.forEach(sub => {
            sub.unsub()
          })
        })
      })
    })
  }

  list(
    relays: string[],
    filters: Filter[],
    opts?: SubscriptionOptions
  ): Promise<Event[]> {
    return new Promise(resolve => {
      let _knownIds: Set<string> = new Set()
      let modifiedOpts = opts || {}
      modifiedOpts.alreadyHaveEvent = id => _knownIds.has(id)

      let events: Event[] = []

      let subs = this.sub(relays, filters, modifiedOpts)
      let timeout = setTimeout(() => {
        subs.forEach(sub => sub.unsub(), 1500)
        resolve(events)
      })

      let pendingEoses = relays.length

      subs.forEach(sub => {
        sub.on('event', (event: Event) => {
          events.push(event)
        })

        sub.on('eose', () => {
          pendingEoses--
          if (pendingEoses === 0) {
            resolve(events)
            clearTimeout(timeout)
            subs.forEach(sub => {
              sub.unsub()
            })
          }
        })
      })
    })
  }

  publish(relays: string[], event: Event): Pub[] {
    return relays.map(relay => {
      let r = this._conn[relay]
      if (!r) return badPub(relay)
      let s = r.publish(event)
      return s
    })
  }
}

function badSub(): Sub {
  return {
    on() {},
    off() {},
    sub(): Sub {
      return badSub()
    },
    unsub() {}
  }
}

function badPub(relay: string): Pub {
  return {
    on(typ, cb) {
      if (typ === 'failed') cb(`relay ${relay} not connected`)
    },
    off() {}
  }
}
