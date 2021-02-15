import 'websocket-polyfill'

import {verifySignature} from './event'

export function normalizeRelayURL(url) {
  let [host, ...qs] = url.split('?')
  if (host.slice(0, 4) === 'http') host = 'ws' + host.slice(4)
  if (host.length && host[host.length - 1] === '/') host = host.slice(0, -1)
  if (host.slice(-3) !== '/ws') host = host + '/ws'
  return [host, ...qs].join('?')
}

export function relayConnect(url, onEvent, onNotice) {
  url = normalizeRelayURL(url)

  let ws, resolveOpen, untilOpen, rejectOpen
  let attemptNumber = 1

  function resetOpenState() {
    untilOpen = new Promise((resolve, reject) => {
      resolveOpen = resolve
      rejectOpen = reject
    })
  }

  function connect() {
    ws = new WebSocket(
      url + (url.indexOf('?') !== -1 ? '&' : '?') + `session=${Math.random()}`
    )

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

        if (data[0] === 'notice') {
          console.log('message from relay ' + url + ': ' + data[1])
          onNotice(data[1])
          return
        }

        if (typeof data[0] === 'object') {
          let event = data[0]
          let context = data[1]

          if (await verifySignature(event)) {
            onEvent(event, context)
          } else {
            console.warn(
              'got event with invalid signature from ' + url,
              event,
              context
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

  async function trySend(msg) {
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

  return {
    url,
    async subKey(key) {
      trySend('sub-key:' + key)
    },
    async unsubKey(key) {
      trySend('unsub-key:' + key)
    },
    async reqFeed(params = {}) {
      trySend('req-feed:' + JSON.stringify(params))
    },
    async reqEvent(params) {
      trySend('req-event:' + JSON.stringify(params))
    },
    async reqKey(params) {
      trySend('req-key:' + JSON.stringify(params))
    },
    async publish(event) {
      trySend(JSON.stringify(event))
    },
    close() {
      ws.close()
    },
    get status() {
      return ws.readyState
    }
  }
}
