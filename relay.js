/* global WebSocket */

import 'websocket-polyfill'

import {verifySignature, validateEvent} from './event.js'
import {matchFilters} from './filter.js'

export function normalizeRelayURL(url) {
  let [host, ...qs] = url.trim().split('?')
  if (host.slice(0, 4) === 'http') host = 'ws' + host.slice(4)
  if (host.slice(0, 2) !== 'ws') host = 'wss://' + host
  if (host.length && host[host.length - 1] === '/') host = host.slice(0, -1)
  return [host, ...qs].join('?')
}

export function relayConnect(url, onNotice = () => {}, onError = () => {}) {
  url = normalizeRelayURL(url)

  var ws, resolveOpen, untilOpen, wasClosed
  var openSubs = {}
  var isSetToSkipVerification = {}
  let attemptNumber = 1
  let nextAttemptSeconds = 1

  function resetOpenState() {
    untilOpen = new Promise(resolve => {
      resolveOpen = resolve
    })
  }

  var channels = {}

  function connect() {
    ws = new WebSocket(url)

    ws.onopen = () => {
      console.log('connected to', url)
      resolveOpen()

      // restablish old subscriptions
      if (wasClosed) {
        wasClosed = false
        for (let channel in openSubs) {
          let filters = openSubs[channel]
          let cb = channels[channel]
          sub({cb, filter: filters}, channel)
        }
      }
    }
    ws.onerror = err => {
      console.log('error connecting to relay', url)
      onError(err)
    }
    ws.onclose = () => {
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
          connect()
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

      if (data.length > 1) {
        if (data[0] === 'NOTICE') {
          if (data.length < 2) return

          console.log('message from relay ' + url + ': ' + data[1])
          onNotice(data[1])
          return
        }

        if (data[0] === 'EVENT') {
          if (data.length < 3) return

          let channel = data[1]
          let event = data[2]

          if (
            validateEvent(event) &&
            (isSetToSkipVerification[channel] || verifySignature(event)) &&
            channels[channel] &&
            matchFilters(openSubs[channel], event)
          ) {
            channels[channel](event)
          }
          return
        }
      }
    }
  }

  resetOpenState()

  try {
    connect()
  } catch (err) {}

  async function trySend(params) {
    let msg = JSON.stringify(params)

    await untilOpen
    ws.send(msg)
  }

  const sub = (
    {cb, filter, beforeSend, skipVerification},
    channel = Math.random().toString().slice(2)
  ) => {
    var filters = []
    if (Array.isArray(filter)) {
      filters = filter
    } else {
      filters.push(filter)
    }

    if (beforeSend) {
      const beforeSendResult = beforeSend({filter, relay: url, channel})
      filters = beforeSendResult.filter
    }

    trySend(['REQ', channel, ...filters])
    channels[channel] = cb
    openSubs[channel] = filters
    isSetToSkipVerification[channel] = skipVerification

    const activeCallback = cb
    const activeFilters = filters
    const activeBeforeSend = beforeSend

    return {
      sub: ({
        cb = activeCallback,
        filter = activeFilters,
        beforeSend = activeBeforeSend
      }) => sub({cb, filter, beforeSend, skipVerification}, channel),
      unsub: () => {
        delete openSubs[channel]
        delete channels[channel]
        delete isSetToSkipVerification[channel]
        trySend(['CLOSE', channel])
      }
    }
  }

  return {
    url,
    sub,
    async publish(event, statusCallback) {
      try {
        await trySend(['EVENT', event])
        if (statusCallback) {
          statusCallback(0)
          let {unsub} = sub(
            {
              cb: () => {
                statusCallback(1)
                unsub()
                clearTimeout(willUnsub)
              },
              filter: {ids: [event.id]}
            },
            `monitor-${event.id.slice(0, 5)}`
          )
          let willUnsub = setTimeout(unsub, 5000)
        }
      } catch (err) {
        if (statusCallback) statusCallback(-1)
      }
    },
    close() {
      ws.close()
    },
    get status() {
      return ws.readyState
    }
  }
}
