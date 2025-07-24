/* global WebSocket */

import type { Event, EventTemplate, VerifiedEvent, Nostr, NostrEvent } from './core.ts'
import { matchFilters, type Filter } from './filter.ts'
import { getHex64, getSubscriptionId } from './fakejson.ts'
import { Queue, normalizeURL } from './utils.ts'
import { makeAuthEvent } from './nip42.ts'
import { yieldThread } from './helpers.ts'

type RelayWebSocket = WebSocket & {
  ping?(): void
  on?(event: 'pong', listener: () => void): any
}

export type AbstractRelayConstructorOptions = {
  verifyEvent: Nostr['verifyEvent']
  websocketImplementation?: typeof WebSocket
  enablePing?: boolean
}

export class SendingOnClosedConnection extends Error {
  constructor(message: string, relay: string) {
    super(`Tried to send message '${message} on a closed connection to ${relay}.`)
    this.name = 'SendingOnClosedConnection'
  }
}

export class AbstractRelay {
  public readonly url: string
  private _connected: boolean = false

  public onclose: (() => void) | null = null
  public onnotice: (msg: string) => void = msg => console.debug(`NOTICE from ${this.url}: ${msg}`)

  public baseEoseTimeout: number = 4400
  public connectionTimeout: number = 4400
  public publishTimeout: number = 4400
  public pingFrequency: number = 45000
  public pingTimeout: number = 45000
  public openSubs: Map<string, Subscription> = new Map()
  public enablePing: boolean | undefined
  private connectionTimeoutHandle: ReturnType<typeof setTimeout> | undefined

  private connectionPromise: Promise<void> | undefined
  private openCountRequests = new Map<string, CountResolver>()
  private openEventPublishes = new Map<string, EventPublishResolver>()
  private ws: RelayWebSocket | undefined
  private incomingMessageQueue = new Queue<string>()
  private queueRunning = false
  private challenge: string | undefined
  private authPromise: Promise<string> | undefined
  private serial: number = 0
  private verifyEvent: Nostr['verifyEvent']

  private _WebSocket: typeof WebSocket

  constructor(url: string, opts: AbstractRelayConstructorOptions) {
    this.url = normalizeURL(url)
    this.verifyEvent = opts.verifyEvent
    this._WebSocket = opts.websocketImplementation || WebSocket
    this.enablePing = opts.enablePing
  }

  static async connect(url: string, opts: AbstractRelayConstructorOptions): Promise<AbstractRelay> {
    const relay = new AbstractRelay(url, opts)
    await relay.connect()
    return relay
  }

  private closeAllSubscriptions(reason: string) {
    for (let [_, sub] of this.openSubs) {
      sub.close(reason)
    }
    this.openSubs.clear()

    for (let [_, ep] of this.openEventPublishes) {
      ep.reject(new Error(reason))
    }
    this.openEventPublishes.clear()

    for (let [_, cr] of this.openCountRequests) {
      cr.reject(new Error(reason))
    }
    this.openCountRequests.clear()
  }

  public get connected(): boolean {
    return this._connected
  }

  public async connect(): Promise<void> {
    if (this.connectionPromise) return this.connectionPromise

    this.challenge = undefined
    this.authPromise = undefined
    this.connectionPromise = new Promise((resolve, reject) => {
      this.connectionTimeoutHandle = setTimeout(() => {
        reject('connection timed out')
        this.connectionPromise = undefined
        this.onclose?.()
        this.closeAllSubscriptions('relay connection timed out')
      }, this.connectionTimeout)

      try {
        this.ws = new this._WebSocket(this.url)
      } catch (err) {
        clearTimeout(this.connectionTimeoutHandle)
        reject(err)
        return
      }

      this.ws.onopen = () => {
        clearTimeout(this.connectionTimeoutHandle)
        this._connected = true
        if (this.enablePing) {
          this.pingpong()
        }
        resolve()
      }

      this.ws.onerror = ev => {
        clearTimeout(this.connectionTimeoutHandle)
        reject((ev as any).message || 'websocket error')
        if (this._connected) {
          this._connected = false
          this.connectionPromise = undefined
          this.onclose?.()
          this.closeAllSubscriptions('relay connection errored')
        }
      }

      this.ws.onclose = ev => {
        clearTimeout(this.connectionTimeoutHandle)
        reject((ev as any).message || 'websocket closed')
        if (this._connected) {
          this._connected = false
          this.connectionPromise = undefined
          this.onclose?.()
          this.closeAllSubscriptions('relay connection closed')
        }
      }

      this.ws.onmessage = this._onmessage.bind(this)
    })

    return this.connectionPromise
  }

  private async waitForPingPong() {
    return new Promise((res, err) => {
      // listen for pong
      (this.ws && this.ws.on && this.ws.on('pong', () => res(true))) || err("ws can't listen for pong")
      // send a ping
      this.ws && this.ws.ping && this.ws.ping()
    })
  }

  private async waitForDummyReq() {
    return new Promise((res, err) => {
      // make a dummy request with expected empty eose reply
      // ["REQ", "_", {"ids":["aaaa...aaaa"]}]
      const sub = this.subscribe([{ ids: ['a'.repeat(64)] }], {
        oneose: () => {
          sub.close()
          res(true)
        },
        eoseTimeout: this.pingTimeout + 1000,
      })
    })
  }

  // nodejs requires this magic here to ensure connections are closed when internet goes off and stuff
  // in browsers it's done automatically. see https://github.com/nbd-wtf/nostr-tools/issues/491
  private async pingpong() {
    // if the websocket is connected
    if (this.ws?.readyState === 1) {
      // wait for either a ping-pong reply or a timeout
      const result = await Promise.any([
        // browsers don't have ping so use a dummy req
        (this.ws && this.ws.ping && this.ws.on) ? this.waitForPingPong() : this.waitForDummyReq(),
        new Promise(res => setTimeout(() => res(false), this.pingTimeout)),
      ])
      if (result) {
        // schedule another pingpong
        setTimeout(() => this.pingpong(), this.pingFrequency)
      } else {
        // pingpong closing socket
        this.closeAllSubscriptions('pingpong timed out')
        this._connected = false
        this.ws?.close()
        this.onclose?.()
      }
    }
  }

  private async runQueue() {
    this.queueRunning = true
    while (true) {
      if (false === this.handleNext()) {
        break
      }
      await yieldThread()
    }
    this.queueRunning = false
  }

  private handleNext(): undefined | false {
    const json = this.incomingMessageQueue.dequeue()
    if (!json) {
      return false
    }

    const subid = getSubscriptionId(json)
    if (subid) {
      const so = this.openSubs.get(subid as string)
      if (!so) {
        // this is an EVENT message, but for a subscription we don't have, so just stop here
        return
      }

      // this will be called only when this message is a EVENT message for a subscription we have
      // we do this before parsing the JSON to not have to do that for duplicate events
      //   since JSON parsing is slow
      const id = getHex64(json, 'id')
      const alreadyHave = so.alreadyHaveEvent?.(id)

      // notify any interested client that the relay has this event
      // (do this after alreadyHaveEvent() because the client may rely on this to answer that)
      so.receivedEvent?.(this, id)

      if (alreadyHave) {
        // if we had already seen this event we can just stop here
        return
      }
    }

    try {
      let data = JSON.parse(json)
      // we won't do any checks against the data since all failures (i.e. invalid messages from relays)
      // will naturally be caught by the encompassing try..catch block

      switch (data[0]) {
        case 'EVENT': {
          const so = this.openSubs.get(data[1] as string) as Subscription
          const event = data[2] as NostrEvent
          if (this.verifyEvent(event) && matchFilters(so.filters, event)) {
            so.onevent(event)
          }
          return
        }
        case 'COUNT': {
          const id: string = data[1]
          const payload = data[2] as { count: number }
          const cr = this.openCountRequests.get(id) as CountResolver
          if (cr) {
            cr.resolve(payload.count)
            this.openCountRequests.delete(id)
          }
          return
        }
        case 'EOSE': {
          const so = this.openSubs.get(data[1] as string)
          if (!so) return
          so.receivedEose()
          return
        }
        case 'OK': {
          const id: string = data[1]
          const ok: boolean = data[2]
          const reason: string = data[3]
          const ep = this.openEventPublishes.get(id) as EventPublishResolver
          if (ep) {
            clearTimeout(ep.timeout)
            if (ok) ep.resolve(reason)
            else ep.reject(new Error(reason))
            this.openEventPublishes.delete(id)
          }
          return
        }
        case 'CLOSED': {
          const id: string = data[1]
          const so = this.openSubs.get(id)
          if (!so) return
          so.closed = true
          so.close(data[2] as string)
          return
        }
        case 'NOTICE':
          this.onnotice(data[1] as string)
          return
        case 'AUTH': {
          this.challenge = data[1] as string
          return
        }
      }
    } catch (err) {
      return
    }
  }

  public async send(message: string) {
    if (!this.connectionPromise) throw new SendingOnClosedConnection(message, this.url)

    this.connectionPromise.then(() => {
      this.ws?.send(message)
    })
  }

  public async auth(signAuthEvent: (evt: EventTemplate) => Promise<VerifiedEvent>): Promise<string> {
    const challenge = this.challenge
    if (!challenge) throw new Error("can't perform auth, no challenge was received")
    if (this.authPromise) return this.authPromise

    this.authPromise = new Promise<string>(async (resolve, reject) => {
      try {
        let evt = await signAuthEvent(makeAuthEvent(this.url, challenge))
        let timeout = setTimeout(() => {
          let ep = this.openEventPublishes.get(evt.id) as EventPublishResolver
          if (ep) {
            ep.reject(new Error('auth timed out'))
            this.openEventPublishes.delete(evt.id)
          }
        }, this.publishTimeout)
        this.openEventPublishes.set(evt.id, { resolve, reject, timeout })
        this.send('["AUTH",' + JSON.stringify(evt) + ']')
      } catch (err) {
        console.warn('subscribe auth function failed:', err)
      }
    })
    return this.authPromise
  }

  public async publish(event: Event): Promise<string> {
    const ret = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const ep = this.openEventPublishes.get(event.id) as EventPublishResolver
        if (ep) {
          ep.reject(new Error('publish timed out'))
          this.openEventPublishes.delete(event.id)
        }
      }, this.publishTimeout)
      this.openEventPublishes.set(event.id, { resolve, reject, timeout })
    })
    this.send('["EVENT",' + JSON.stringify(event) + ']')
    return ret
  }

  public async count(filters: Filter[], params: { id?: string | null }): Promise<number> {
    this.serial++
    const id = params?.id || 'count:' + this.serial
    const ret = new Promise<number>((resolve, reject) => {
      this.openCountRequests.set(id, { resolve, reject })
    })
    this.send('["COUNT","' + id + '",' + JSON.stringify(filters).substring(1))
    return ret
  }

  public subscribe(
    filters: Filter[],
    params: Partial<SubscriptionParams> & { label?: string; id?: string },
  ): Subscription {
    const subscription = this.prepareSubscription(filters, params)
    subscription.fire()
    return subscription
  }

  public prepareSubscription(
    filters: Filter[],
    params: Partial<SubscriptionParams> & { label?: string; id?: string },
  ): Subscription {
    this.serial++
    const id = params.id || (params.label ? params.label + ':' : 'sub:') + this.serial
    const subscription = new Subscription(this, id, filters, params)
    this.openSubs.set(id, subscription)
    return subscription
  }

  public close() {
    this.closeAllSubscriptions('relay connection closed by us')
    this._connected = false
    this.ws?.close()
    this.onclose?.()
  }

  // this is the function assigned to this.ws.onmessage
  // it's exposed for testing and debugging purposes
  public _onmessage(ev: MessageEvent<any>) {
    this.incomingMessageQueue.enqueue(ev.data as string)
    if (!this.queueRunning) {
      this.runQueue()
    }
  }
}

export class Subscription {
  public readonly relay: AbstractRelay
  public readonly id: string

  public closed: boolean = false
  public eosed: boolean = false
  public filters: Filter[]
  public alreadyHaveEvent: ((id: string) => boolean) | undefined
  public receivedEvent: ((relay: AbstractRelay, id: string) => void) | undefined

  public onevent: (evt: Event) => void
  public oneose: (() => void) | undefined
  public onclose: ((reason: string) => void) | undefined

  public eoseTimeout: number
  private eoseTimeoutHandle: ReturnType<typeof setTimeout> | undefined

  constructor(relay: AbstractRelay, id: string, filters: Filter[], params: SubscriptionParams) {
    this.relay = relay
    this.filters = filters
    this.id = id
    this.alreadyHaveEvent = params.alreadyHaveEvent
    this.receivedEvent = params.receivedEvent
    this.eoseTimeout = params.eoseTimeout || relay.baseEoseTimeout

    this.oneose = params.oneose
    this.onclose = params.onclose
    this.onevent =
      params.onevent ||
      (event => {
        console.warn(
          `onevent() callback not defined for subscription '${this.id}' in relay ${this.relay.url}. event received:`,
          event,
        )
      })
  }

  public fire() {
    this.relay.send('["REQ","' + this.id + '",' + JSON.stringify(this.filters).substring(1))

    // only now we start counting the eoseTimeout
    this.eoseTimeoutHandle = setTimeout(this.receivedEose.bind(this), this.eoseTimeout)
  }

  public receivedEose() {
    if (this.eosed) return
    clearTimeout(this.eoseTimeoutHandle)
    this.eosed = true
    this.oneose?.()
  }

  public close(reason: string = 'closed by caller') {
    if (!this.closed && this.relay.connected) {
      // if the connection was closed by the user calling .close() we will send a CLOSE message
      // otherwise this._open will be already set to false so we will skip this
      try {
        this.relay.send('["CLOSE",' + JSON.stringify(this.id) + ']')
      } catch (err) {
        if (err instanceof SendingOnClosedConnection) {
          /* doesn't matter, it's ok */
        } else {
          throw err
        }
      }
      this.closed = true
    }
    this.relay.openSubs.delete(this.id)
    this.onclose?.(reason)
  }
}

export type SubscriptionParams = {
  onevent?: (evt: Event) => void
  oneose?: () => void
  onclose?: (reason: string) => void
  alreadyHaveEvent?: (id: string) => boolean
  receivedEvent?: (relay: AbstractRelay, id: string) => void
  eoseTimeout?: number
}

export type CountResolver = {
  resolve: (count: number) => void
  reject: (err: Error) => void
}

export type EventPublishResolver = {
  resolve: (reason: string) => void
  reject: (err: Error) => void
  timeout: ReturnType<typeof setTimeout>
}
