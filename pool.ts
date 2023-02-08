import {Relay, relayInit} from './relay'
import {normalizeURL} from './utils'

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
    return relay
  }
}
