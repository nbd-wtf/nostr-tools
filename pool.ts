import { relayConnect, type Relay, SubscriptionParams, Subscription } from './relay.ts'
import { normalizeURL } from './utils.ts'

import type { Event } from './event.ts'
import { type Filter } from './filter.ts'

export type SubscribeManyParams = Omit<SubscriptionParams, 'onclose'> & {
  eoseSubTimeout: number
  onclose?: (reasons: string[]) => void
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

  async subscribeMany(
    relays: string[],
    filters: Filter[],
    params: SubscribeManyParams,
  ): Promise<{ close: () => void }> {
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
    params.alreadyHaveEvent = (id: string) => {
      if (params.alreadyHaveEvent?.(id)) {
        return true
      }
      const have = _knownIds.has(id)
      _knownIds.add(id)
      return have
    }

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
    }, params.eoseSubTimeout || 5400)

    // batch all closes into a single
    const closesReceived: string[] = []
    const handleClose = (i: number, reason: string) => {
      handleEose()
      closesReceived[i] = reason
      if (closesReceived.length === relays.length) {
        params.onclose?.(closesReceived)
      }
    }

    // open a subscription in all given relays
    await Promise.all(
      relays.map(normalizeURL).map(async (url, i) => {
        if (relays.indexOf(url) !== i) {
          // duplicate
          handleClose(i, 'duplicate')
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
        })

        subs.push(subscription)
      }),
    )

    return {
      close() {
        subs.forEach(sub => {
          sub.close()
        })
      },
    }
  }

  async subscribeManyEose(
    relays: string[],
    filters: Filter[],
    params: Pick<SubscribeManyParams, 'id' | 'onevent' | 'onclose' | 'eoseSubTimeout'>,
  ): Promise<{ close: () => void }> {
    const sub = await this.subscribeMany(relays, filters, {
      ...params,
      oneose() {
        sub.close()
      },
    })
    return sub
  }

  get(
    relays: string[],
    filter: Filter,
    params: Pick<SubscribeManyParams, 'id' | 'eoseSubTimeout'>,
  ): Promise<Event | null> {
    return new Promise(async (resolve, reject) => {
      const sub = await this.subscribeManyEose(relays, [filter], {
        ...params,
        onevent(event: Event) {
          resolve(event)
          sub.close()
        },
        onclose(reasons: string[]) {
          const err = new Error('subscriptions closed')
          err.cause = reasons
          reject(err)
        },
      })
    })
  }

  publish(relays: string[], event: Event): Promise<string>[] {
    return relays.map(normalizeURL).map(async (url, i) => {
      if (relays.indexOf(url) !== i) {
        // duplicate
        return Promise.reject('duplicate')
      }

      let r = await this.ensureRelay(url)
      return r.publish(event)
    })
  }
}
