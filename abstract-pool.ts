/* global WebSocket */

import {
  AbstractRelay as AbstractRelay,
  SubscriptionParams,
  Subscription,
  type AbstractRelayConstructorOptions,
} from './abstract-relay.ts'
import { normalizeURL } from './utils.ts'

import type { Event, EventTemplate, Nostr, VerifiedEvent } from './core.ts'
import { type Filter } from './filter.ts'
import { alwaysTrue } from './helpers.ts'

export type SubCloser = { close: () => void }

export type AbstractPoolConstructorOptions = AbstractRelayConstructorOptions & {}

export type SubscribeManyParams = Omit<SubscriptionParams, 'onclose'> & {
  maxWait?: number
  onclose?: (reasons: string[]) => void
  doauth?: (event: EventTemplate) => Promise<VerifiedEvent>
  id?: string
  label?: string
}

export class AbstractSimplePool {
  protected relays: Map<string, AbstractRelay> = new Map()
  public seenOn: Map<string, Set<AbstractRelay>> = new Map()
  public trackRelays: boolean = false

  public verifyEvent: Nostr['verifyEvent']
  public trustedRelayURLs: Set<string> = new Set()

  private _WebSocket?: typeof WebSocket

  constructor(opts: AbstractPoolConstructorOptions) {
    this.verifyEvent = opts.verifyEvent
    this._WebSocket = opts.websocketImplementation
  }

  async ensureRelay(url: string, params?: { connectionTimeout?: number }): Promise<AbstractRelay> {
    url = normalizeURL(url)

    let relay = this.relays.get(url)
    if (!relay) {
      relay = new AbstractRelay(url, {
        verifyEvent: this.trustedRelayURLs.has(url) ? alwaysTrue : this.verifyEvent,
        websocketImplementation: this._WebSocket,
      })
      if (params?.connectionTimeout) relay.connectionTimeout = params.connectionTimeout
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

  subscribe(relays: string[], filter: Filter, params: SubscribeManyParams): SubCloser {
    return this.subscribeMap(
      relays.map(url => ({ url, filter })),
      params,
    )
  }

  subscribeMany(relays: string[], filters: Filter[], params: SubscribeManyParams): SubCloser {
    return this.subscribeMap(
      relays.flatMap(url => filters.map(filter => ({ url, filter }))),
      params,
    )
  }

  subscribeMap(requests: { url: string; filter: Filter }[], params: SubscribeManyParams): SubCloser {
    if (this.trackRelays) {
      params.receivedEvent = (relay: AbstractRelay, id: string) => {
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
      if (eosesReceived[i]) return // do not act twice for the same relay
      eosesReceived[i] = true
      if (eosesReceived.filter(a => a).length === requests.length) {
        params.oneose?.()
        handleEose = () => {}
      }
    }
    // batch all closes into a single
    const closesReceived: string[] = []
    let handleClose = (i: number, reason: string) => {
      if (closesReceived[i]) return // do not act twice for the same relay
      handleEose(i)
      closesReceived[i] = reason
      if (closesReceived.filter(a => a).length === requests.length) {
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
      requests.map(async ({ url, filter }, i) => {
        url = normalizeURL(url)

        let relay: AbstractRelay
        try {
          relay = await this.ensureRelay(url, {
            connectionTimeout: params.maxWait ? Math.max(params.maxWait * 0.8, params.maxWait - 1000) : undefined,
          })
        } catch (err) {
          handleClose(i, (err as any)?.message || String(err))
          return
        }

        let subscription = relay.subscribe([filter], {
          ...params,
          oneose: () => handleEose(i),
          onclose: reason => {
            if (reason.startsWith('auth-required:') && params.doauth) {
              relay
                .auth(params.doauth)
                .then(() => {
                  relay.subscribe([filter], {
                    ...params,
                    oneose: () => handleEose(i),
                    onclose: reason => {
                      handleClose(i, reason) // the second time we won't try to auth anymore
                    },
                    alreadyHaveEvent: localAlreadyHaveEventHandler,
                    eoseTimeout: params.maxWait,
                  })
                })
                .catch(err => {
                  handleClose(i, `auth was required and attempted, but failed with: ${err}`)
                })
            } else {
              handleClose(i, reason)
            }
          },
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

  /**
   * @deprecated Use subscribeMap instead.
   */
  subscribeManyMap(requests: { [relay: string]: Filter[] }, params: SubscribeManyParams): SubCloser {
    if (this.trackRelays) {
      params.receivedEvent = (relay: AbstractRelay, id: string) => {
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
    const relaysLength = Object.keys(requests).length

    // batch all EOSEs into a single
    const eosesReceived: boolean[] = []
    let handleEose = (i: number) => {
      if (eosesReceived[i]) return // do not act twice for the same relay
      eosesReceived[i] = true
      if (eosesReceived.filter(a => a).length === relaysLength) {
        params.oneose?.()
        handleEose = () => {}
      }
    }
    // batch all closes into a single
    const closesReceived: string[] = []
    let handleClose = (i: number, reason: string) => {
      if (closesReceived[i]) return // do not act twice for the same relay
      handleEose(i)
      closesReceived[i] = reason
      if (closesReceived.filter(a => a).length === relaysLength) {
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
      Object.entries(requests).map(async (req, i, arr) => {
        if (arr.indexOf(req) !== i) {
          // duplicate
          handleClose(i, 'duplicate url')
          return
        }

        let [url, filters] = req
        url = normalizeURL(url)

        let relay: AbstractRelay
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
          onclose: reason => {
            if (reason.startsWith('auth-required:') && params.doauth) {
              relay
                .auth(params.doauth)
                .then(() => {
                  relay.subscribe(filters, {
                    ...params,
                    oneose: () => handleEose(i),
                    onclose: reason => {
                      handleClose(i, reason) // the second time we won't try to auth anymore
                    },
                    alreadyHaveEvent: localAlreadyHaveEventHandler,
                    eoseTimeout: params.maxWait,
                  })
                })
                .catch(err => {
                  handleClose(i, `auth was required and attempted, but failed with: ${err}`)
                })
            } else {
              handleClose(i, reason)
            }
          },
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

  subscribeEose(
    relays: string[],
    filter: Filter,
    params: Pick<SubscribeManyParams, 'label' | 'id' | 'onevent' | 'onclose' | 'maxWait' | 'doauth'>,
  ): SubCloser {
    const subcloser = this.subscribe(relays, filter, {
      ...params,
      oneose() {
        subcloser.close()
      },
    })
    return subcloser
  }

  subscribeManyEose(
    relays: string[],
    filters: Filter[],
    params: Pick<SubscribeManyParams, 'label' | 'id' | 'onevent' | 'onclose' | 'maxWait' | 'doauth'>,
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
    params?: Pick<SubscribeManyParams, 'label' | 'id' | 'maxWait'>,
  ): Promise<Event[]> {
    return new Promise(async resolve => {
      const events: Event[] = []
      this.subscribeEose(relays, filter, {
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
    params?: Pick<SubscribeManyParams, 'label' | 'id' | 'maxWait'>,
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
      return r.publish(event).then(reason => {
        if (this.trackRelays) {
          let set = this.seenOn.get(event.id)
          if (!set) {
            set = new Set()
            this.seenOn.set(event.id, set)
          }
          set.add(r)
        }
        return reason
      })
    })
  }

  listConnectionStatus(): Map<string, boolean> {
    const map = new Map<string, boolean>()
    this.relays.forEach((relay, url) => map.set(url, relay.connected))

    return map
  }

  destroy(): void {
    this.relays.forEach(conn => conn.close())
    this.relays = new Map()
  }
}
