import {Relay, relayInit} from './relay'
import {normalizeURL} from './utils'
import {Filter} from './filter'
import {Event} from './event'
import {SubscriptionOptions, Sub} from './relay'

export function pool(defaultRelays: string[] = []) {
  return new SimplePool(defaultRelays)
}

class SimplePool {
  private _conn: {[url: string]: Relay}
  private _knownIds: Set<string> = new Set()

  constructor(defaultRelays: string[]) {
    this._conn = {}
    defaultRelays.forEach(this.ensureRelay)
  }

  ensureRelay(url: string): Relay {
    const nm = normalizeURL(url)
    const existing = this._conn[nm]
    if (existing) return existing

    const hasEventId = (id: string): boolean => this._knownIds.has(id)
    const relay = relayInit(nm, hasEventId)
    this._conn[nm] = relay

    let sub = relay.sub
    relay.sub = (filters: Filter[], opts?: SubscriptionOptions): Sub => {
      let s = sub(filters, opts)
      s.on('event', (event: Event) => this._knownIds.add(event.id as string))
      return s
    }

    return relay
  }
}
