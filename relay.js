import 'websocket-polyfill'

import {verifySignature} from './event'
import {sha256} from './utils'

const R = require('ramda')

export function normalizeRelayURL(url) {
  let [host, ...qs] = url.split('?')
  if (host.slice(0, 4) === 'http') host = 'ws' + host.slice(4)
  if (host.length && host[host.length - 1] === '/') host = host.slice(0, -1)
  if (host.slice(-3) !== '/ws') host = host + '/ws'
  return [host, ...qs].join('?')
}

export function relayConnect(url, onNotice) {
  url = normalizeRelayURL(url)

  var ws, resolveOpen, untilOpen, rejectOpen
  let attemptNumber = 1

  function resetOpenState() {
    untilOpen = new Promise((resolve, reject) => {
      resolveOpen = resolve
      rejectOpen = reject
    })
  }

  var channels = {}

  function connect() {
    ws = new WebSocket(url)

    ws.onopen = () => {
      console.log('connected to', url)
      resolveOpen()
    }
    ws.onerror = err => {
      console.log('error connecting to relay', url, err)
      rejectOpen()
    }
    ws.onclose = () => {
      resetOpenState()
      attemptNumber++
      console.log(
        `relay ${url} connection closed. reconnecting in ${attemptNumber} seconds.`
      )
      setTimeout(async () => {
        try {
          connect()
        } catch (err) {}
      }, attemptNumber * 1000)
    }

    ws.onmessage = async e => {
      var data
      try {
        data = JSON.parse(e.data)
      } catch (err) {
        data = e.data
      }

      if (data.length > 1) {
        if (data === 'PING') {
          ws.send('PONG')
          return
        }

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

          if (await verifySignature(event)) {
            if (channels[channel]) {
              channels[channel](event)
            }
          } else {
            console.warn(
              'got event with invalid signature from ' + url,
              event,
              id
            )
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

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(msg)
    } else {
      try {
        await untilOpen
        ws.send(msg)
      } catch (e) {
        console.log(`waiting to connect to ${url}`)
      }
    }
  }

  const sub = async (channel, cb, params) => {
    trySend(['REQ', channel, params])

    channels[channel] = cb

    return {
      sub: R.partial(sub, [channel]),
      unsub: () => trySend(['CLOSE', channel])
    }
  }

  return {
    url,
    sub: R.partial(sub, [sha256(Math.random().toString())]),
    async publish(event) {
      trySend(JSON.stringify(['EVENT', event]))
    },
    close() {
      ws.close()
    },
    get status() {
      return ws.readyState
    }
  }
}
