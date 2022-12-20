/* global WebSocket */

import 'websocket-polyfill'

import {Event, verifySignature, validateEvent} from './event'
import {Filter, matchFilters} from './filter'

export type Relay = {
  url: string
  status: number
  connect: () => void
  close: () => void
  sub: (filters: Filter[], opts: SubscriptionOptions) => Sub
  publish: (event: Event) => Pub
  on: (type: 'connect' | 'disconnect' | 'notice', cb: any) => void
  off: (type: 'connect' | 'disconnect' | 'notice', cb: any) => void
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

type SubscriptionOptions = {
  skipVerification?: boolean
  id?: string
}

export function relayInit(url: string): Relay {
  var ws: WebSocket
  var resolveOpen: () => void
  var resolveClose: () => void
  var untilOpen: Promise<void>
  var wasClosed: boolean
  var closed: boolean
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
  let attemptNumber = 1
  let nextAttemptSeconds = 1
  let isConnected = false

  function resetOpenState() {
    untilOpen = new Promise(resolve => {
      resolveOpen = resolve
    })
  }

  function connectRelay() {
    ws = new WebSocket(url)

    ws.onopen = () => {
      listeners.connect.forEach(cb => cb())
      resolveOpen()
      isConnected = true

      // restablish old subscriptions
      if (wasClosed) {
        wasClosed = false
        for (let id in openSubs) {
          let {filters} = openSubs[id]
          sub(filters, openSubs[id])
        }
      }
    }
    ws.onerror = () => {
      isConnected = false
      listeners.error.forEach(cb => cb())
    }
    ws.onclose = async () => {
      isConnected = false
      listeners.disconnect.forEach(cb => cb())

      if (closed) {
        // we've closed this because we wanted, so end everything
        resolveClose()
        return
      }

      // otherwise keep trying to reconnect
      resetOpenState()
      attemptNumber++
      nextAttemptSeconds += attemptNumber ** 3
      if (nextAttemptSeconds > 14400) {
        nextAttemptSeconds = 14400 // 4 hours
      }
      console.log(
        `relay ${url} connection closed. reconnecting in ${nextAttemptSeconds} seconds.`
      )
      setTimeout(async () => {
        try {
          connectRelay()
        } catch (err) {}
      }, nextAttemptSeconds * 1000)

      wasClosed = true
    }

    ws.onmessage = async e => {
      var data
      try {
        data = JSON.parse(e.data)
      } catch (err) {
        data = e.data
      }

      if (data.length >= 1) {
        switch (data[0]) {
          case 'EVENT':
            if (data.length !== 3) return // ignore empty or malformed EVENT

            let id = data[1]
            let event = data[2]
            if (
              validateEvent(event) &&
              openSubs[id] &&
              (openSubs[id].skipVerification || verifySignature(event)) &&
              matchFilters(openSubs[id].filters, event)
            ) {
              openSubs[id]
              subListeners[id]?.event.forEach(cb => cb(event))
            }
            return
          case 'EOSE': {
            if (data.length !== 2) return // ignore empty or malformed EOSE
            let id = data[1]
            subListeners[id]?.eose.forEach(cb => cb())
            return
          }
          case 'OK': {
            if (data.length < 3) return // ignore empty or malformed OK
            let id: string = data[1]
            let ok: boolean = data[2]
            let reason: string = data[3] || ''
            if (ok) pubListeners[id]?.ok.forEach(cb => cb())
            else pubListeners[id]?.failed.forEach(cb => cb(reason))
            return
          }
          case 'NOTICE':
            if (data.length !== 2) return // ignore empty or malformed NOTICE
            let notice = data[1]
            listeners.notice.forEach(cb => cb(notice))
            return
        }
      }
    }
  }

  resetOpenState()

  async function connect(): Promise<void> {
    if (ws?.readyState && ws.readyState === 1) return // ws already open
    try {
      connectRelay()
    } catch (err) {}
  }

  async function trySend(params: [string, ...any]) {
    let msg = JSON.stringify(params)

    await untilOpen
    ws.send(msg)
  }

  const sub = (
    filters: Filter[],
    {
      skipVerification = false,
      id = Math.random().toString().slice(2)
    }: SubscriptionOptions = {}
  ): Sub => {
    let subid = id

    openSubs[subid] = {
      id: subid,
      filters,
      skipVerification
    }
    trySend(['REQ', subid, ...filters])

    return {
      sub: (newFilters, newOpts = {}) =>
        sub(newFilters || filters, {
          skipVerification: newOpts.skipVerification || skipVerification,
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
        let idx = subListeners[subid][type].indexOf(cb)
        if (idx >= 0) subListeners[subid][type].splice(idx, 1)
      }
    }
  }

  return {
    url,
    sub,
    on: (type: 'connect' | 'disconnect' | 'notice', cb: any): void => {
      listeners[type].push(cb)
      if (type === 'connect' && isConnected) {
        cb()
      }
    },
    off: (type: 'connect' | 'disconnect' | 'notice', cb: any): void => {
      let index = listeners[type].indexOf(cb)
      if (index !== -1) listeners[type].splice(index, 1)
    },
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
          pubListeners[id].failed.forEach(cb =>
            cb('event not seen after 5 seconds')
          )
          monitor.unsub()
        }, 5000)
        monitor.on('event', () => {
          clearTimeout(willUnsub)
          pubListeners[id].seen.forEach(cb => cb())
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
          let idx = pubListeners[id][type].indexOf(cb)
          if (idx >= 0) pubListeners[id][type].splice(idx, 1)
        }
      }
    },
    connect,
    close(): Promise<void> {
      closed = true // prevent ws from trying to reconnect
      ws.close()
      return new Promise(resolve => {
        resolveClose = resolve
      })
    },
    get status() {
      return ws.readyState
    }
  }
}
