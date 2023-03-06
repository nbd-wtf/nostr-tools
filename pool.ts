import {Relay, relayInit} from './relay'
import {normalizeURL} from './utils'
import {Filter} from './filter'
import {Event} from './event'
import {SubscriptionOptions, Sub, Pub} from './relay'

export class SimplePool {
  private _conn: {[url: string]: Relay}
  private _seenOn: {[id: string]: Set<string>} = {} // a map of all events we've seen in each relay

  private eoseSubTimeout: number
  private getTimeout: number

  constructor(options: {eoseSubTimeout?: number; getTimeout?: number} = {}) {
    this._conn = {}
    this.eoseSubTimeout = options.eoseSubTimeout || 3400
    this.getTimeout = options.getTimeout || 3400
  }

  close(relays: string[]): void {
    relays.forEach(url => {
      let relay = this._conn[normalizeURL(url)]
      if (relay) relay.close()
    })
  }

  async ensureRelay(url: string): Promise<Relay> {
    const nm = normalizeURL(url)
    const existing = this._conn[nm]
    if (existing && existing.status === 1) return existing

    if (existing) {
      await existing.connect();
      return existing
    }

    const relay = relayInit(nm, {
      getTimeout: this.getTimeout * 0.9,
      listTimeout: this.getTimeout * 0.9
    })
    this._conn[nm] = relay

    await relay.connect()

    return relay
  }

  sub(relays: string[], filters: Filter[], opts?: SubscriptionOptions): Sub {
    let _knownIds: Set<string> = new Set()
    let modifiedOpts = opts || {}
    modifiedOpts.alreadyHaveEvent = (id, url) => {
      let set = this._seenOn[id] || new Set()
      set.add(url)
      this._seenOn[id] = set
      return _knownIds.has(id)
    }

    let subs: Sub[] = []
    let eventListeners: Set<(event: Event) => void> = new Set()
    let eoseListeners: Set<() => void> = new Set()
    let eosesMissing = relays.length

    let eoseSent = false
    let eoseTimeout = setTimeout(() => {
      eoseSent = true
      for (let cb of eoseListeners.values()) cb()
    }, this.eoseSubTimeout)

    relays.forEach(async relay => {
      let r
      try {
        r = await this.ensureRelay(relay)
      } catch (err) {
        handleEose()
        return
      }
      if (!r) return
      let s = r.sub(filters, modifiedOpts)
      s.on('event', (event: Event) => {
        _knownIds.add(event.id as string)
        for (let cb of eventListeners.values()) cb(event)
      })
      s.on('eose', () => {
        if (eoseSent) return
        handleEose()
      })
      subs.push(s)

      function handleEose() {
        eosesMissing--
        if (eosesMissing === 0) {
          clearTimeout(eoseTimeout)
          for (let cb of eoseListeners.values()) cb()
        }
      }
    })

    let greaterSub: Sub = {
      sub(filters, opts) {
        subs.forEach(sub => sub.sub(filters, opts))
        return greaterSub
      },
      unsub() {
        subs.forEach(sub => sub.unsub())
      },
      on(type, cb) {
        switch (type) {
          case 'event':
            eventListeners.add(cb)
            break
          case 'eose':
            eoseListeners.add(cb)
            break
        }
      },
      off(type, cb) {
        if (type === 'event') {
          eventListeners.delete(cb)
        } else if (type === 'eose') eoseListeners.delete(cb)
      }
    }

    return greaterSub
  }

  get(
    relays: string[],
    filter: Filter,
    opts?: SubscriptionOptions
  ): Promise<Event | null> {
    return new Promise(resolve => {
      let sub = this.sub(relays, [filter], opts)
      let timeout = setTimeout(() => {
        sub.unsub()
        resolve(null)
      }, this.getTimeout)
      sub.on('event', (event: Event) => {
        resolve(event)
        clearTimeout(timeout)
        sub.unsub()
      })
    })
  }

  list(
    relays: string[],
    filters: Filter[],
    opts?: SubscriptionOptions
  ): Promise<Event[]> {
    return new Promise(resolve => {
      let events: Event[] = []
      let sub = this.sub(relays, filters, opts)

      sub.on('event', (event: Event) => {
        events.push(event)
      })

      // we can rely on an eose being emitted here because pool.sub() will fake one
      sub.on('eose', () => {
        sub.unsub()
        resolve(events)
      })
    })
  }

  publish(relays: string[], event: Event): Pub {
    let pubs = relays.map(relay => {
      let r = this._conn[normalizeURL(relay)]
      if (!r) return badPub(relay)
      return r.publish(event)
    })

    return {
      on(type, cb) {
        pubs.forEach((pub, i) => {
          pub.on(type, () => cb(relays[i]))
        })
      },
      off() {
        // do nothing here, FIXME
      }
    }
  }

  seenOn(id: string): string[] {
    return Array.from(this._seenOn[id]?.values?.() || [])
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
