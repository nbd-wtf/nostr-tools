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
import { Relay } from './relay.ts'

export type SubCloser = { close: (reason?: string) => void }

export type AbstractPoolConstructorOptions = AbstractRelayConstructorOptions & {
  // automaticallyAuth takes a relay URL and should return null
  // in case that relay shouldn't be authenticated against
  // or a function to sign the AUTH event template otherwise (that function may still throw in case of failure)
  automaticallyAuth?: (relayURL: string) => null | ((event: EventTemplate) => Promise<VerifiedEvent>)
  // onRelayConnectionFailure is called with the URL of a relay that failed the initial connection
  onRelayConnectionFailure?: (url: string) => void
  // onRelayConnectionSuccess is called with the URL of a relay that succeeds the initial connection
  onRelayConnectionSuccess?: (url: string) => void
  // allowConnectingToRelay takes a relay URL and the operation being performed
  // return false to skip connecting to that relay
  allowConnectingToRelay?: (url: string, operation: ['read', Filter[]] | ['write', Event]) => boolean
  // maxWaitForConnection takes a number in milliseconds that will be given to ensureRelay such that we
  // don't get stuck forever when attempting to connect to a relay, it is 3000 (3 seconds) by default
  maxWaitForConnection: number
}

export type SubscribeManyParams = Omit<SubscriptionParams, 'onclose'> & {
  maxWait?: number
  abort?: AbortSignal
  onclose?: (reasons: string[]) => void
  onauth?: (event: EventTemplate) => Promise<VerifiedEvent>
  id?: string
  label?: string
}

export class AbstractSimplePool {
  protected relays: Map<string, AbstractRelay> = new Map()
  public seenOn: Map<string, Set<AbstractRelay>> = new Map()
  public trackRelays: boolean = false

  public verifyEvent: Nostr['verifyEvent']
  public enablePing: boolean | undefined
  public enableReconnect: boolean
  public automaticallyAuth?: (relayURL: string) => null | ((event: EventTemplate) => Promise<VerifiedEvent>)
  public trustedRelayURLs: Set<string> = new Set()
  public onRelayConnectionFailure?: (url: string) => void
  public onRelayConnectionSuccess?: (url: string) => void
  public allowConnectingToRelay?: (url: string, operation: ['read', Filter[]] | ['write', Event]) => boolean
  public maxWaitForConnection: number

  private _WebSocket?: typeof WebSocket

  constructor(opts: AbstractPoolConstructorOptions) {
    this.verifyEvent = opts.verifyEvent
    this._WebSocket = opts.websocketImplementation
    this.enablePing = opts.enablePing
    this.enableReconnect = opts.enableReconnect || false
    this.automaticallyAuth = opts.automaticallyAuth
    this.onRelayConnectionFailure = opts.onRelayConnectionFailure
    this.onRelayConnectionSuccess = opts.onRelayConnectionSuccess
    this.allowConnectingToRelay = opts.allowConnectingToRelay
    this.maxWaitForConnection = opts.maxWaitForConnection || 3000
  }

  async ensureRelay(
    url: string,
    params?: {
      connectionTimeout?: number
      abort?: AbortSignal
    },
  ): Promise<AbstractRelay> {
    url = normalizeURL(url)

    let relay = this.relays.get(url)
    if (!relay) {
      relay = new AbstractRelay(url, {
        verifyEvent: this.trustedRelayURLs.has(url) ? alwaysTrue : this.verifyEvent,
        websocketImplementation: this._WebSocket,
        enablePing: this.enablePing,
        enableReconnect: this.enableReconnect,
      })
      relay.onclose = () => {
        if (relay && !relay.enableReconnect) {
          this.relays.delete(url)
        }
      }
      this.relays.set(url, relay)
    }

    if (this.automaticallyAuth) {
      const authSignerFn = this.automaticallyAuth(url)
      if (authSignerFn) {
        relay.onauth = authSignerFn
      }
    }

    await relay.connect({
      timeout: params?.connectionTimeout,
      abort: params?.abort,
    })

    return relay
  }

  close(relays: string[]) {
    relays.map(normalizeURL).forEach(url => {
      this.relays.get(url)?.close()
      this.relays.delete(url)
    })
  }

  subscribe(relays: string[], filter: Filter, params: SubscribeManyParams): SubCloser {
    const request: { url: string; filter: Filter }[] = []
    const uniqUrls: string[] = []
    for (let i = 0; i < relays.length; i++) {
      const url = normalizeURL(relays[i])
      if (!request.find(r => r.url === url)) {
        if (uniqUrls.indexOf(url) === -1) {
          uniqUrls.push(url)
          request.push({ url, filter: filter })
        }
      }
    }

    return this.subscribeMap(request, params)
  }

  subscribeMany(relays: string[], filter: Filter, params: SubscribeManyParams): SubCloser {
    return this.subscribe(relays, filter, params)
  }

  subscribeMap(requests: { url: string; filter: Filter }[], params: SubscribeManyParams): SubCloser {
    const grouped = new Map<string, Filter[]>()
    for (const req of requests) {
      const { url, filter } = req
      if (!grouped.has(url)) grouped.set(url, [])
      grouped.get(url)!.push(filter)
    }
    const groupedRequests = Array.from(grouped.entries()).map(([url, filters]) => ({ url, filters }))

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
      if (eosesReceived.filter(a => a).length === groupedRequests.length) {
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
      if (closesReceived.filter(a => a).length === groupedRequests.length) {
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
      groupedRequests.map(async ({ url, filters }, i) => {
        if (this.allowConnectingToRelay?.(url, ['read', filters]) === false) {
          handleClose(i, 'connection skipped by allowConnectingToRelay')
          return
        }

        let relay: AbstractRelay
        try {
          relay = await this.ensureRelay(url, {
            connectionTimeout:
              this.maxWaitForConnection < (params.maxWait || 0)
                ? Math.max(params.maxWait! * 0.8, params.maxWait! - 1000)
                : this.maxWaitForConnection,
            abort: params.abort,
          })
        } catch (err) {
          this.onRelayConnectionFailure?.(url)
          handleClose(i, (err as any)?.message || String(err))
          return
        }

        this.onRelayConnectionSuccess?.(url)

        let subscription = relay.subscribe(filters, {
          ...params,
          oneose: () => handleEose(i),
          onclose: reason => {
            if (reason.startsWith('auth-required: ') && params.onauth) {
              relay
                .auth(params.onauth)
                .then(() => {
                  relay.subscribe(filters, {
                    ...params,
                    oneose: () => handleEose(i),
                    onclose: reason => {
                      handleClose(i, reason) // the second time we won't try to auth anymore
                    },
                    alreadyHaveEvent: localAlreadyHaveEventHandler,
                    eoseTimeout: params.maxWait,
                    abort: params.abort,
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
          abort: params.abort,
        })

        subs.push(subscription)
      }),
    )

    return {
      async close(reason?: string) {
        await allOpened
        subs.forEach(sub => {
          sub.close(reason)
        })
      },
    }
  }

  subscribeEose(
    relays: string[],
    filter: Filter,
    params: Pick<SubscribeManyParams, 'label' | 'id' | 'onevent' | 'onclose' | 'maxWait' | 'onauth'>,
  ): SubCloser {
    const subcloser = this.subscribe(relays, filter, {
      ...params,
      oneose() {
        subcloser.close('closed automatically on eose')
      },
    })
    return subcloser
  }

  subscribeManyEose(
    relays: string[],
    filter: Filter,
    params: Pick<SubscribeManyParams, 'label' | 'id' | 'onevent' | 'onclose' | 'maxWait' | 'onauth'>,
  ): SubCloser {
    return this.subscribeEose(relays, filter, params)
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

  publish(
    relays: string[],
    event: Event,
    params?: {
      onauth?: (evt: EventTemplate) => Promise<VerifiedEvent>
      maxWait?: number
      abort?: AbortSignal
    },
  ): Promise<string>[] {
    return relays.map(normalizeURL).map(async (url, i, arr) => {
      if (arr.indexOf(url) !== i) {
        // duplicate
        return Promise.reject('duplicate url')
      }

      if (this.allowConnectingToRelay?.(url, ['write', event]) === false) {
        return Promise.reject('connection skipped by allowConnectingToRelay')
      }

      let r: Relay
      try {
        r = await this.ensureRelay(url, {
          connectionTimeout:
            this.maxWaitForConnection < (params?.maxWait || 0)
              ? Math.max(params!.maxWait! * 0.8, params!.maxWait! - 1000)
              : this.maxWaitForConnection,
          abort: params?.abort,
        })
      } catch (err) {
        this.onRelayConnectionFailure?.(url)
        return String('connection failure: ' + String(err))
      }

      return r
        .publish(event)
        .catch(async err => {
          if (err instanceof Error && err.message.startsWith('auth-required: ') && params?.onauth) {
            await r.auth(params.onauth)
            return r.publish(event) // retry
          }
          throw err
        })
        .then(reason => {
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
