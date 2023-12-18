import { relayConnect, type Relay, SubscriptionParams, Subscription } from './relay.ts'
import { normalizeURL } from './utils.ts'

import type { Event } from './event.ts'
import { type Filter } from './filter.ts'

export type SubCloser = { close: () => void }

export type SubscribeManyParams = Omit<SubscriptionParams, 'onclose' | 'id'> & {
  eoseSubTimeout?: number
  onclose?: (reasons: string[]) => void
  id?: string
}

export class SimplePool {
  private relays = new Map<string, Relay>()
  public seenOn = new Map<string, Set<Relay>>()
  public trackRelays: boolean = false

  async ensureRelay(url: string): Promise<Relay> {
    url = normalizeURL(url)

    let relay = this.relays.get(url)
    if (!relay) {
      relay = relayConnect(url)
      this.relays.set(url, relay)
    }

    return relay
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
    let eosesMissing = relays.length
    let handleEose = () => {
      eosesMissing--
      if (eosesMissing === 0) {
        clearTimeout(eoseTimeout)
        params.oneose?.()
      }
    }
    const eoseTimeout = setTimeout(() => {
      handleEose = () => {}
      params.oneose?.()
    }, params.eoseSubTimeout || 3400)

    // batch all closes into a single
    const closesReceived: string[] = []
    const handleClose = (i: number, reason: string) => {
      handleEose()
      closesReceived[i] = reason
      if (closesReceived.length === relays.length) {
        params.onclose?.(closesReceived)
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
          relay = await this.ensureRelay(url)
        } catch (err) {
          handleEose()
          return
        }

        let subscription = await relay.subscribe(filters, {
          ...params,
          oneose: handleEose,
          onclose: reason => handleClose(i, reason),
          alreadyHaveEvent: localAlreadyHaveEventHandler,
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
    params: Pick<SubscribeManyParams, 'id' | 'onevent' | 'onclose' | 'eoseSubTimeout'>,
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
    params?: Pick<SubscribeManyParams, 'id' | 'eoseSubTimeout'>,
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
    params?: Pick<SubscribeManyParams, 'id' | 'eoseSubTimeout'>,
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
