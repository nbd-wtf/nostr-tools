/* global WebSocket */

import { verifySignature, validateEvent, type Event, EventTemplate } from './event.ts'
import { matchFilters, type Filter } from './filter.ts'
import { getHex64, getSubscriptionId } from './fakejson.ts'
import { Queue, normalizeURL } from './utils.ts'
import { nip42 } from './index.ts'

export function relayConnect(url: string) {
  const relay = new Relay(url)
  relay.connect()
  return relay
}

export class Relay {
  public readonly url: string
  private _connected: boolean = false

  public trusted: boolean = false
  public onclose: (() => void) | null = null
  public onnotice: (msg: string) => void = msg => console.log(`NOTICE from ${this.url}: ${msg}`)

  private connectionPromise: Promise<void> | undefined
  private openSubs = new Map<string, Subscription>()
  private openCountRequests = new Map<string, CountResolver>()
  private openEventPublishes = new Map<string, EventPublishResolver>()
  private ws: WebSocket | undefined
  private incomingMessageQueue = new Queue<string>()
  private queueRunning = false
  private challenge: string | undefined
  private serial: number = 0

  constructor(url: string) {
    this.url = normalizeURL(url)
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
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)
      } catch (err) {
        reject(err)
        return
      }

      this.ws.onopen = () => {
        this._connected = true
        resolve()
      }

      this.ws.onerror = ev => {
        reject((ev as any).message)
        if (this._connected) {
          this.onclose?.()
          this.closeAllSubscriptions('relay connection errored')
          this._connected = false
        }
      }

      this.ws.onclose = async () => {
        this.connectionPromise = undefined
        this.onclose?.()
        this.closeAllSubscriptions('relay connection closed')
        this._connected = false
      }

      this.ws.onmessage = ev => {
        this.incomingMessageQueue.enqueue(ev.data as string)
        if (!this.queueRunning) {
          this.runQueue()
        }
      }
    })

    return this.connectionPromise
  }

  private async runQueue() {
    this.queueRunning = true
    while (true) {
      if (false === this.handleNext()) {
        break
      }
      await Promise.resolve()
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
      so.receivedEvent?.(id) // this is so the client knows this relay had this event
      if (so.alreadyHaveEvent?.(id)) {
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
          const event = data[2] as Event
          if ((this.trusted || (validateEvent(event) && verifySignature(event))) && matchFilters(so.filters, event)) {
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
          if (!so || so.eosed) return
          so.eosed = true
          so.oneose?.()
          return
        }
        case 'OK': {
          const id: string = data[1]
          const ok: boolean = data[2]
          const reason: string = data[3]
          const ep = this.openEventPublishes.get(id) as EventPublishResolver
          if (ok) ep.resolve(reason)
          else ep.reject(new Error(reason))
          this.openEventPublishes.delete(id)
          return
        }
        case 'CLOSED': {
          const id: string = data[1]
          const so = this.openSubs.get(id)
          if (!so) return
          so.closed = true
          so.close(data[2] as string)
          this.openSubs.delete(id)
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
    await this.connect()
    this.ws?.send(message)
  }

  public async auth(signAuthEvent: (authEvent: EventTemplate) => Promise<void>) {
    if (!this.challenge) throw new Error("can't perform auth, no challenge was received")
    const evt = nip42.makeAuthEvent(this.url, this.challenge)
    await Promise.all([signAuthEvent(evt), this.connect()])
    this.send('["AUTH",' + JSON.stringify(evt) + ']')
  }

  public async publish(event: Event): Promise<string> {
    await this.connect()
    const ret = new Promise<string>((resolve, reject) => {
      this.openEventPublishes.set(event.id, { resolve, reject })
    })
    this.send('["EVENT",' + JSON.stringify(event) + ']')
    return ret
  }

  public async count(filters: Filter[], params: { id?: string | null }): Promise<number> {
    await this.connect()
    this.serial++
    const id = params?.id || 'count:' + this.serial
    const ret = new Promise<number>((resolve, reject) => {
      this.openCountRequests.set(id, { resolve, reject })
    })
    this.send('["COUNT","' + id + '",' + JSON.stringify(filters) + ']')
    return ret
  }

  public async subscribe(filters: Filter[], params: Partial<SubscriptionParams>) {
    await this.connect()
    this.serial++
    const id = params.id || 'sub:' + this.serial
    const subscription = new Subscription(this, filters, {
      onevent: event => {
        console.warn(
          `onevent() callback not defined for subscription '${id}' in relay ${this.url}. event received:`,
          event,
        )
      },
      ...params,
      id,
    })
    this.openSubs.set(id, subscription)
    this.send('["REQ","' + id + '",' + JSON.stringify(filters).substring(1))
    return subscription
  }

  public close() {
    this.closeAllSubscriptions('relay connection closed by us')
    this._connected = false
    this.ws?.close()
  }
}

export class Subscription {
  public readonly relay: Relay
  public readonly id: string
  public closed: boolean = false
  public eosed: boolean = false

  public alreadyHaveEvent: ((id: string) => boolean) | undefined
  public receivedEvent: ((id: string) => boolean) | undefined
  public readonly filters: Filter[]

  public onevent: (evt: Event) => void
  public oneose: (() => void) | undefined
  public onclose: ((reason: string) => void) | undefined

  constructor(relay: Relay, filters: Filter[], params: SubscriptionParams) {
    this.relay = relay
    this.filters = filters
    this.id = params.id
    this.onevent = params.onevent
    this.oneose = params.oneose
    this.onclose = params.onclose
    this.alreadyHaveEvent = params.alreadyHaveEvent
    this.receivedEvent = params.receivedEvent
  }

  public close(reason: string = 'closed by caller') {
    if (!this.closed) {
      // if the connection was closed by the user calling .close() we will send a CLOSE message
      // otherwise this._open will be already set to false so we will skip this
      this.relay.send('["CLOSE",' + JSON.stringify(this.id) + ']')
      this.closed = true
    }
    this.onclose?.(reason)
  }
}

export type SubscriptionParams = {
  id: string
  onevent: (evt: Event) => void
  oneose?: () => void
  onclose?: (reason: string) => void
  alreadyHaveEvent?: (id: string) => boolean
  receivedEvent?: (id: string) => boolean
}

export type CountResolver = {
  resolve: (count: number) => void
  reject: (err: Error) => void
}

export type EventPublishResolver = {
  resolve: (reason: string) => void
  reject: (err: Error) => void
}
