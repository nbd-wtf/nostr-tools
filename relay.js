/* global WebSocket */

import 'websocket-polyfill'

import { verifySignature, validateEvent } from './event.js'
import { matchFilters } from './filter.js'

export function normalizeRelayURL(url) {
  let [host, ...qs] = url.trim().split('?')
  if (host.slice(0, 4) === 'http') host = 'ws' + host.slice(4)
  if (host.slice(0, 2) !== 'ws') host = 'wss://' + host
  if (host.length && host[host.length - 1] === '/') host = host.slice(0, -1)
  return [host, ...qs].join('?')
}

export function relayInit(url) {
  url = normalizeRelayURL(url)

  var ws, resolveOpen, untilOpen, wasClosed
  var openSubs = {}
  var listeners = {
    event: { '_': [] },
    eose: { '_': [] },
    connection: { '_': [] },
    disconnection: { '_': [] },
    error: { '_': [] },
    notice: { '_': [] },
  }
  let attemptNumber = 1
  let nextAttemptSeconds = 1

  function resetOpenState() {
    untilOpen = new Promise(resolve => {
      resolveOpen = resolve
    })
  }

  function connectRelay() {
    ws = new WebSocket(url)

    ws.onopen = () => {
      console.log('connected to', url)
      listeners.connection._.forEach(cb => cb(url))
      resolveOpen()

      // restablish old subscriptions
      if (wasClosed) {
        wasClosed = false
        for (let id in openSubs) {
          sub(openSubs[id], id)
        }
      }
    }
    ws.onerror = err => {
      console.log('error connecting to relay', url)
      listeners.error._.forEach(cb => cb(err))
    }
    ws.onclose = async () => {
      listeners.disconnection._.forEach(cb => cb(url))
      resetOpenState()
      attemptNumber++
      nextAttemptSeconds += attemptNumber ** 3
      if (nextAttemptSeconds > 14400) {
        nextAttemptSeconds = 14400 // 4 hours
      }
      console.log(
        `relay ${url} connection closed. reconnecting in ${nextAttemptSeconds} seconds.`
      )
      setTimeout(await connect(), nextAttemptSeconds * 1000)

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
          case 'NOTICE':
            if (data.length !== 2) {
              // ignore empty or malformed notice
              return
            }
            if (listeners.notice._.length) listeners.notice._.forEach(cb => cb(data[1]))
            return
          case 'EOSE':
            if (data.length !== 2) {
              // ignore malformed EOSE
              return
            }
            if (listeners.eose[data[1]]?.length) listeners.eose[data[1]].forEach(cb => cb())
            if (listeners.eose._.length) listeners.eose._.forEach(cb => cb())
            return
          case 'EVENT':
            if (data.length !== 3) {
              // ignore malformed EVENT
              return
            }
            let id = data[1]
            let event = data[2]
            if (validateEvent(event) && openSubs[id] &&
              (openSubs[id].skipVerification || verifySignature(event)) &&
              matchFilters(openSubs[id].filter, event)
            ) {
              if (listeners.event[id]?.length) listeners.event[id].forEach(cb => cb(event))
              if (listeners.event._.length) listeners.event._.forEach(cb => cb(event))
            }
            return
        }
      }
    }
  }

  resetOpenState()

  async function connect() {
    try {
      connectRelay()
    } catch (err) { }
  }

  async function trySend(params) {
    let msg = JSON.stringify(params)

    await untilOpen
    ws.send(msg)
  }

  const sub = ({ filter, beforeSend, skipVerification }, id = Math.random().toString().slice(2)) => {
    var filters = []
    if (Array.isArray(filter)) {
      filters = filter
    } else {
      filters.push(filter)
    }
    filter = filters

    if (beforeSend) {
      const beforeSendResult = beforeSend({ filter, relay: url, id })
      filter = beforeSendResult.filter
    }

    trySend(['REQ', id, ...filter])
    openSubs[id] = {
      filter,
      beforeSend,
      skipVerification,
    }

    const activeFilters = filter
    const activeBeforeSend = beforeSend

    return {
      sub: ({
        filter = activeFilters,
        beforeSend = activeBeforeSend
      }) => sub({ filter, beforeSend, skipVerification }, id),
      unsub: () => {
        delete openSubs[id]
        delete listeners.event[id]
        delete listeners.eose[id]
        trySend(['CLOSE', id])
      }
    }
  }

  function on(type, cb, id = '_') {
    listeners[type][id] = listeners[type][id] || []
    listeners[type][id].push(cb)
  }

  function off(type, cb, id = '_') {
    if (!listeners[type][id].length) return
    let index = listeners[type][id].indexOf(cb)
    if (index !== -1) listeners[type][id].splice(index, 1)
  }

  return {
    url,
    sub,
    on,
    off,
    async publish(event, statusCallback) {
      try {
        await trySend(['EVENT', event])
        if (statusCallback) {
          statusCallback(0)
          let { unsub } = sub(
            {
              cb: () => {
                statusCallback(1)
                unsub()
                clearTimeout(willUnsub)
              },
              filter: { ids: [event.id] }
            },
            `monitor-${event.id.slice(0, 5)}`
          )
          let willUnsub = setTimeout(unsub, 5000)
        }
      } catch (err) {
        if (statusCallback) statusCallback(-1)
      }
    },
    connect,
    close() {
      ws.close()
    },
    get status() {
      return ws.readyState
    }
  }
}
