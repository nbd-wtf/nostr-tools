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
