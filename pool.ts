import { Relay, SubscriptionParams, Subscription } from './relay.ts'
import { normalizeURL } from './utils.ts'

import type { Event } from './pure.ts'
import { type Filter } from './filter.ts'

export type SubCloser = { close: () => void }

export type SubscribeManyParams = Omit<SubscriptionParams, 'onclose' | 'id'> & {
  maxWait?: number
  onclose?: (reasons: string[]) => void
  id?: string
}

export class SimplePool {
  private relays = new Map<string, Relay>()
  public seenOn = new Map<string, Set<Relay>>()
  public trackRelays: boolean = false

  public trustedRelayURLs = new Set<string>()

  async ensureRelay(url: string, params?: { connectionTimeout?: number }): Promise<Relay> {
    url = normalizeURL(url)

    let relay = this.relays.get(url)
    if (!relay) {
      relay = new Relay(url)
      if (params?.connectionTimeout) relay.connectionTimeout = params.connectionTimeout
      if (this.trustedRelayURLs.has(relay.url)) relay.trusted = true
      this.relays.set(url, relay)
    }
    await relay.connect()

    return relay
  }

  close(relays: string[]) {
    relays.map(normalizeURL).forEach(url => {
      this.relays.get(url)?.close()
    })
  }

  subscribeMany(relays: string[], filters: Filter[], params: SubscribeManyParams): SubCloser {
    if (this.trackRelays) {
      params.receivedEvent = (relay: Relay, id: string) => {
        let set = this.seenOn.get(id)
        if (!set) {
          set = new Set()
          this.seenOn.set(id, set)
        }
        set.add(relay)
      }
    }

    const _knownIds = new Set<string>()
    const subs: Subscription[] = []

    // batch all EOSEs into a single
    const eosesReceived: boolean[] = []
    let handleEose = (i: number) => {
      eosesReceived[i] = true
      if (eosesReceived.filter(a => a).length === relays.length) {
        params.oneose?.()
        handleEose = () => {}
      }
    }
    // batch all closes into a single
    const closesReceived: string[] = []
    let handleClose = (i: number, reason: string) => {
      handleEose(i)
      closesReceived[i] = reason
      if (closesReceived.filter(a => a).length === relays.length) {
        params.onclose?.(closesReceived)
        handleClose = () => {}
      }
    }

    const localAlreadyHaveEventHandler = (id: string) => {
      if (params.alreadyHaveEvent?.(id)) {
        return true
      }
      const have = _knownIds.has(id)
      _knownIds.add(id)
      return have
    }

    // open a subscription in all given relays
    const allOpened = Promise.all(
      relays.map(normalizeURL).map(async (url, i, arr) => {
        if (arr.indexOf(url) !== i) {
          // duplicate
          handleClose(i, 'duplicate url')
          return
        }

        let relay: Relay
        try {
          relay = await this.ensureRelay(url, {
            connectionTimeout: params.maxWait ? Math.max(params.maxWait * 0.8, params.maxWait - 1000) : undefined,
          })
        } catch (err) {
          handleClose(i, (err as any)?.message || String(err))
          return
        }

        let subscription = relay.subscribe(filters, {
          ...params,
          oneose: () => handleEose(i),
          onclose: reason => handleClose(i, reason),
          alreadyHaveEvent: localAlreadyHaveEventHandler,
          eoseTimeout: params.maxWait,
        })

        subs.push(subscription)
      }),
    )

    return {
      async close() {
        await allOpened
        subs.forEach(sub => {
          sub.close()
        })
      },
    }
  }

  subscribeManyEose(
    relays: string[],
    filters: Filter[],
    params: Pick<SubscribeManyParams, 'id' | 'onevent' | 'onclose' | 'maxWait'>,
  ): SubCloser {
    const subcloser = this.subscribeMany(relays, filters, {
      ...params,
      oneose() {
        subcloser.close()
      },
    })
    return subcloser
  }

  async querySync(
    relays: string[],
    filter: Filter,
    params?: Pick<SubscribeManyParams, 'id' | 'maxWait'>,
  ): Promise<Event[]> {
    return new Promise(async resolve => {
      const events: Event[] = []
      this.subscribeManyEose(relays, [filter], {
        ...params,
        onevent(event: Event) {
          events.push(event)
        },
        onclose(_: string[]) {
          resolve(events)
        },
      })
    })
  }

  async get(
    relays: string[],
    filter: Filter,
    params?: Pick<SubscribeManyParams, 'id' | 'maxWait'>,
  ): Promise<Event | null> {
    filter.limit = 1
    const events = await this.querySync(relays, filter, params)
    events.sort((a, b) => b.created_at - a.created_at)
    return events[0] || null
  }

  publish(relays: string[], event: Event): Promise<string>[] {
    return relays.map(normalizeURL).map(async (url, i, arr) => {
      if (arr.indexOf(url) !== i) {
        // duplicate
        return Promise.reject('duplicate url')
      }

      let r = await this.ensureRelay(url)
      return r.publish(event)
    })
  }
}
