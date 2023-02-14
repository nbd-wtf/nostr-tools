/* global WebSocket */

import {Event, verifySignature, validateEvent} from './event'
import {Filter, matchFilters} from './filter'
import {getHex64, getSubscriptionId} from './fakejson'

type RelayEvent = 'connect' | 'disconnect' | 'error' | 'notice'

export type Relay = {
  url: string
  status: number
  connect: () => Promise<void>
  close: () => Promise<void>
  sub: (filters: Filter[], opts?: SubscriptionOptions) => Sub
  list: (filters: Filter[], opts?: SubscriptionOptions) => Promise<Event[]>
  get: (filter: Filter, opts?: SubscriptionOptions) => Promise<Event | null>
  publish: (event: Event) => Pub
  on: (type: RelayEvent, cb: any) => void
  off: (type: RelayEvent, cb: any) => void
}
export type Pub = {
  on: (type: 'ok' | 'seen' | 'failed', cb: any) => void
  off: (type: 'ok' | 'seen' | 'failed', cb: any) => void
}
export type Sub = {
  sub: (filters: Filter[], opts: SubscriptionOptions) => Sub
  unsub: () => void
  on: (type: 'event' | 'eose', cb: any) => void
  off: (type: 'event' | 'eose', cb: any) => void
}

export type SubscriptionOptions = {
  id?: string
  skipVerification?: boolean
  alreadyHaveEvent?: null | ((id: string, relay: string) => boolean)
}

export function relayInit(url: string): Relay {
  var ws: WebSocket
  var resolveClose: () => void
  var openSubs: {[id: string]: {filters: Filter[]} & SubscriptionOptions} = {}
  var listeners: {
    connect: Array<() => void>
    disconnect: Array<() => void>
    error: Array<() => void>
    notice: Array<(msg: string) => void>
  } = {
    connect: [],
    disconnect: [],
    error: [],
    notice: []
  }
  var subListeners: {
    [subid: string]: {
      event: Array<(event: Event) => void>
      eose: Array<() => void>
    }
  } = {}
  var pubListeners: {
    [eventid: string]: {
      ok: Array<() => void>
      seen: Array<() => void>
      failed: Array<(reason: string) => void>
    }
  } = {}

  async function connectRelay(): Promise<void> {
    return new Promise((resolve, reject) => {
      ws = new WebSocket(url)

      ws.onopen = () => {
        listeners.connect.forEach(cb => cb())
        resolve()
      }
      ws.onerror = () => {
        listeners.error.forEach(cb => cb())
        reject()
      }
      ws.onclose = async () => {
        listeners.disconnect.forEach(cb => cb())
        resolveClose && resolveClose()
      }

      let incomingMessageQueue: string[] = []
      let handleNextInterval: any

      ws.onmessage = e => {
        incomingMessageQueue.push(e.data)
        if (!handleNextInterval) {
          handleNextInterval = setInterval(handleNext, 0)
        }
      }

      function handleNext() {
        if (incomingMessageQueue.length === 0) {
          clearInterval(handleNextInterval)
          handleNextInterval = null
          return
        }

        var json = incomingMessageQueue.shift()
        if (!json) return

        let subid = getSubscriptionId(json)
        if (subid) {
          let so = openSubs[subid]
          if (
            so &&
            so.alreadyHaveEvent &&
            so.alreadyHaveEvent(getHex64(json, 'id'), url)
          ) {
            return
          }
        }

        try {
          let data = JSON.parse(json)

          // we won't do any checks against the data since all failures (i.e. invalid messages from relays)
          // will naturally be caught by the encompassing try..catch block

          switch (data[0]) {
            case 'EVENT':
              let id = data[1]
              let event = data[2]
              if (
                validateEvent(event) &&
                openSubs[id] &&
                (openSubs[id].skipVerification || verifySignature(event)) &&
                matchFilters(openSubs[id].filters, event)
              ) {
                openSubs[id]
                ;(subListeners[id]?.event || []).forEach(cb => cb(event))
              }
              return
            case 'EOSE': {
              let id = data[1]
              ;(subListeners[id]?.eose || []).forEach(cb => cb())
              return
            }
            case 'OK': {
              let id: string = data[1]
              let ok: boolean = data[2]
              let reason: string = data[3] || ''
              if (ok) pubListeners[id]?.ok.forEach(cb => cb())
              else pubListeners[id]?.failed.forEach(cb => cb(reason))
              return
            }
            case 'NOTICE':
              let notice = data[1]
              listeners.notice.forEach(cb => cb(notice))
              return
          }
        } catch (err) {
          return
        }
      }
    })
  }

  async function connect(): Promise<void> {
    if (ws?.readyState && ws.readyState === 1) return // ws already open
    await connectRelay()
  }

  async function trySend(params: [string, ...any]) {
    let msg = JSON.stringify(params)

    try {
      ws.send(msg)
    } catch (err) {
      console.log(err)
    }
  }

  const sub = (
    filters: Filter[],
    {
      skipVerification = false,
      alreadyHaveEvent = null,
      id = Math.random().toString().slice(2)
    }: SubscriptionOptions = {}
  ): Sub => {
    let subid = id

    openSubs[subid] = {
      id: subid,
      filters,
      skipVerification,
      alreadyHaveEvent
    }
    trySend(['REQ', subid, ...filters])

    return {
      sub: (newFilters, newOpts = {}) =>
        sub(newFilters || filters, {
          skipVerification: newOpts.skipVerification || skipVerification,
          alreadyHaveEvent: newOpts.alreadyHaveEvent || alreadyHaveEvent,
          id: subid
        }),
      unsub: () => {
        delete openSubs[subid]
        delete subListeners[subid]
        trySend(['CLOSE', subid])
      },
      on: (type: 'event' | 'eose', cb: any): void => {
        subListeners[subid] = subListeners[subid] || {
          event: [],
          eose: []
        }
        subListeners[subid][type].push(cb)
      },
      off: (type: 'event' | 'eose', cb: any): void => {
        let listeners = subListeners[subid]
        let idx = listeners[type].indexOf(cb)
        if (idx >= 0) listeners[type].splice(idx, 1)
      }
    }
  }

  return {
    url,
    sub,
    on: (type: RelayEvent, cb: any): void => {
      listeners[type].push(cb)
      if (type === 'connect' && ws?.readyState === 1) {
        cb()
      }
    },
    off: (type: RelayEvent, cb: any): void => {
      let index = listeners[type].indexOf(cb)
      if (index !== -1) listeners[type].splice(index, 1)
    },
    list: (filters: Filter[], opts?: SubscriptionOptions): Promise<Event[]> =>
      new Promise(resolve => {
        let s = sub(filters, opts)
        let events: Event[] = []
        let timeout = setTimeout(() => {
          s.unsub()
          resolve(events)
        }, 1500)
        s.on('eose', () => {
          s.unsub()
          clearTimeout(timeout)
          resolve(events)
        })
        s.on('event', (event: Event) => {
          events.push(event)
        })
      }),
    get: (filter: Filter, opts?: SubscriptionOptions): Promise<Event | null> =>
      new Promise(resolve => {
        let s = sub([filter], opts)
        let timeout = setTimeout(() => {
          s.unsub()
          resolve(null)
        }, 1500)
        s.on('event', (event: Event) => {
          s.unsub()
          clearTimeout(timeout)
          resolve(event)
        })
      }),
    publish(event: Event): Pub {
      if (!event.id) throw new Error(`event ${event} has no id`)
      let id = event.id

      var sent = false
      var mustMonitor = false

      trySend(['EVENT', event])
        .then(() => {
          sent = true
          if (mustMonitor) {
            startMonitoring()
            mustMonitor = false
          }
        })
        .catch(() => {})

      const startMonitoring = () => {
        let monitor = sub([{ids: [id]}], {
          id: `monitor-${id.slice(0, 5)}`
        })
        let willUnsub = setTimeout(() => {
          ;(pubListeners[id]?.failed || []).forEach(cb =>
            cb('event not seen after 5 seconds')
          )
          monitor.unsub()
        }, 5000)
        monitor.on('event', () => {
          clearTimeout(willUnsub)
          ;(pubListeners[id]?.seen || []).forEach(cb => cb())
        })
      }

      return {
        on: (type: 'ok' | 'seen' | 'failed', cb: any) => {
          pubListeners[id] = pubListeners[id] || {
            ok: [],
            seen: [],
            failed: []
          }
          pubListeners[id][type].push(cb)

          if (type === 'seen') {
            if (sent) startMonitoring()
            else mustMonitor = true
          }
        },
        off: (type: 'ok' | 'seen' | 'failed', cb: any) => {
          let listeners = pubListeners[id]
          if (!listeners) return
          let idx = listeners[type].indexOf(cb)
          if (idx >= 0) listeners[type].splice(idx, 1)
        }
      }
    },
    connect,
    close(): Promise<void> {
      if (ws.readyState > 1) return Promise.resolve()
      ws.close()
      return new Promise<void>(resolve => {
        resolveClose = resolve
      })
    },
    get status() {
      return ws?.readyState ?? 3
    }
  }
}
