import PersistentWebSocket from 'pws'
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
  url = url +=
    (url.indexOf('?') !== -1 ? '&' : '?') + `session=${Math.random()}`

  const ws = new PersistentWebSocket(url, {
    pingTimeout: 30 * 1000
  })

  var isOpen
  let untilOpen = new Promise(resolve => {
    isOpen = resolve
  })

  ws.onopen = () => {
    console.log('connected to ', url)
    isOpen()
  }
  ws.onerror = err => console.log('error connecting', url, err)

  ws.onmessage = async e => {
    let data = JSON.parse(e.data)
    if (data.length > 1) {
      if (data[0] === 'notice') {
        console.log('message from relay ' + url + ' :' + data[1])
        onNotice(data[1])
      } else if (typeof data[0] === 'object') {
        let context = data[0]
        let event = data[1]

        if (await verifySignature(event)) {
          onEvent(context, event)
        } else {
          console.warn(
            'got event with invalid signature from ' + url,
            event,
            context
          )
        }
      }
    }
  }

  return {
    url,
    async subKey(key) {
      await untilOpen
      ws.send('sub-key:' + key)
    },
    async unsubKey(key) {
      await untilOpen
      ws.send('unsub-key:' + key)
    },
    async reqFeed(params = {}) {
      await untilOpen
      ws.send('req-feed:' + JSON.stringify(params))
    },
    async reqEvent(params) {
      await untilOpen
      ws.send('req-key:' + JSON.stringify(params))
    },
    async reqKey(params) {
      await untilOpen
      ws.send('req-key:' + JSON.stringify(params))
    },
    async publish(event) {
      await untilOpen
      ws.send(JSON.stringify(event))
    },
    close() {
      ws.close()
    }
  }
}
