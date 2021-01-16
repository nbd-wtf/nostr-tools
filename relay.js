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

  const ws = new WebSocket(
    url + (url.indexOf('?') !== -1 ? '&' : '?') + `session=${Math.random()}`,
    {
      pingTimeout: 180 * 1000
    }
  )

  var isOpen
  let untilOpen = new Promise(resolve => {
    isOpen = resolve
  })

  ws.onopen = () => {
    console.log('connected to', url)
    isOpen()
  }
  ws.onerror = err => console.log('error connecting to relay', url, err)
  ws.onclose = () => console.log('relay connection closed', url)

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
      ws.send('req-event:' + JSON.stringify(params))
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
