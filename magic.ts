import {Relay, relayInit} from './relay'
import {Event} from './event'
import {normalizeURL} from './utils'

export default function (
  writeableRelays: string[],
  fallbackRelays: string[],
  safeRelays: string[]
) {
  return new MagicPool(fallbackRelays, writeableRelays, safeRelays)
}

class MagicPool {
  private _conn: {[url: string]: Relay}
  private _fallback: {[url: string]: Relay}
  private _write: {[url: string]: Relay}
  private _safe: {[url: string]: Relay}

  private _profileRelays: {[pubkey: string]: RelayTableScore}
  private _tempCache: {[id: string]: Event}

  constructor(
    fallbackRelays: string[],
    writeableRelays: string[],
    safeRelays: string[] = [
      'wss://eden.nostr.land',
      'wss://nostr.milou.lol',
      'wss://relay.minds.com/nostr/v1/ws'
    ]
  ) {
    this._conn = {}
    this._write = {}
    this._fallback = {}
    this._profileRelays = {}
    this._tempCache = {}

    const hasEventId = (id: string): boolean => id in this._tempCache
    const init = (url: string) => {
      this._conn[normalizeURL(url)] = relayInit(normalizeURL(url), hasEventId)
    }

    fallbackRelays.forEach(init)
    writeableRelays.forEach(init)
    safeRelays.forEach(init)

    this._write = Object.fromEntries(
      writeableRelays.map(url => [
        normalizeURL(url),
        this._conn[normalizeURL(url)]
      ])
    )
    this._fallback = Object.fromEntries(
      fallbackRelays.map(url => [
        normalizeURL(url),
        this._conn[normalizeURL(url)]
      ])
    )
    this._safe = Object.fromEntries(
      safeRelays.map(url => [normalizeURL(url), this._conn[normalizeURL(url)]])
    )
  }

  publish(event: Event) {
    return Promise.all(
      Object.entries(this._write).map(
        ([url, relay]) =>
          new Promise(async resolve => {
            await relay.connect()
            let pub = relay.publish(event)
            let to = setTimeout(() => {
              let end = setTimeout(() => {
                resolve({url, success: false, reason: 'timeout'})
              }, 2500)
              pub.on('seen', () => {
                clearTimeout(end)
                resolve({url, success: true, reason: 'seen'})
              })
            }, 2500)
            pub.on('ok', () => {
              clearTimeout(to)
              resolve({url, success: true, reason: 'ok'})
            })
            pub.on('failed', (reason: string) => {
              clearTimeout(to)
              resolve({url, success: false, reason})
            })
          })
      )
    )
  }

  profile(
    pubkey: string,
    onUpdate: (events: Event[]) => void
  ): {
    page(n: number): void
  } {
    var relays = new Set()
    let rts = this._profileRelays[pubkey]
    if (rts) {
      relays = rts.get(3)
    }

    let fallback = Object.values(this._fallback)
    for (let i = 0; i < fallback.length; i++) {
      if (relays.size < 3) {
        relays.add(fallback[Math.floor(Math.random() * fallback.length)])
      } else break
    }

    // start subscription
    for (let r in relays) {
        r.
    }

    return {
      page(n: number) {}
    }
  }
}

class RelayTableScore {
  seen: string[] = []
  hinted: string[] = []
  explicit: string[] = []

  get(n: number): Set<string> {
    let relays = new Set<string>()
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 3; j++) {
        let v = [this.seen, this.explicit, this.hinted][j][i]
        if (v) {
          relays.add(v)
          if (relays.size >= n) return relays
        }
      }
    }
    return relays
  }
}
