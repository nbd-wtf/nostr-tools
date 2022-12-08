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
  let relay = normalizeRelayURL(url) // set relay url

  var ws, resolveOpen, untilOpen, wasClosed, closed
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
    ws = new WebSocket(relay)

    ws.onopen = () => {
      listeners.connection._.forEach(cb => cb({ type: 'connection', relay }))
      resolveOpen()

      // restablish old subscriptions
      if (wasClosed) {
        wasClosed = false
        for (let id in openSubs) {
          sub(openSubs[id], id)
        }
      }
    }
    ws.onerror = error => {
      listeners.error._.forEach(cb => cb({ type: 'error', relay, error }))
    }
    ws.onclose = async () => {
      listeners.disconnection._.forEach(cb => cb({ type: 'disconnection', relay }))
      if (closed) return
      resetOpenState()
      attemptNumber++
      nextAttemptSeconds += attemptNumber ** 3
      if (nextAttemptSeconds > 14400) {
        nextAttemptSeconds = 14400 // 4 hours
      }
      console.log(
        `relay ${relay} connection closed. reconnecting in ${nextAttemptSeconds} seconds.`
      )
      setTimeout(async () => {
        try {
          connectRelay()
        } catch (err) { }
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
            if (validateEvent(event) && openSubs[id] &&
              (openSubs[id].skipVerification || verifySignature(event)) &&
              matchFilters(openSubs[id].filter, event)
            ) {
              if (listeners.event[id]?.length) listeners.event[id].forEach(cb => cb({ type: 'event', relay, id, event }))
              if (listeners.event._.length) listeners.event._.forEach(cb => cb({ type: 'event', relay, id, event }))
            }
            return
          case 'EOSE': {
            if (data.length !== 2) return // ignore empty or malformed EOSE

            let id = data[1]
            if (listeners.eose[id]?.length) listeners.eose[data[1]].forEach(cb => cb({ type: 'eose', relay, id }))
            if (listeners.eose._.length) listeners.eose._.forEach(cb => cb({ type: 'eose', relay, id }))
            return
          }
          case 'NOTICE':
            if (data.length !== 2) return // ignore empty or malformed NOTICE

            let notice = data[1]
            if (listeners.notice._.length) listeners.notice._.forEach(cb => cb({ type: 'notice', relay, notice }))
            return
        }
      }
    }
  }

  resetOpenState()

  async function connect() {
    if (ws?.readyState && ws.readyState === 1) return // ws already open
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
      const beforeSendResult = beforeSend({ filter, relay, id })
      filter = beforeSendResult.filter
    }

    openSubs[id] = {
      filter,
      beforeSend,
      skipVerification,
    }
    trySend(['REQ', id, ...filter])

    return {
      sub: ({
        filter = openSubs[id].filter,
        beforeSend = openSubs[id].beforeSend,
        skipVerification = openSubs[id].skipVerification }
      ) => sub({ filter, beforeSend, skipVerification }, id),
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
          let id = `monitor-${event.id.slice(0, 5)}`
          statusCallback(0)
          let { unsub } = sub({ filter: { ids: [event.id] } }, id)
          on('event', () => {
            statusCallback(1)
            unsub()
            clearTimeout(willUnsub)
          }, id)
          let willUnsub = setTimeout(unsub, 5000)
        }
      } catch (err) {
        if (statusCallback) statusCallback(-1)
      }
    },
    connect,
    close() {
      closed = true // prevent ws from trying to reconnect
      ws.close()
    },
    get status() {
      return ws.readyState
    }
  }
}
