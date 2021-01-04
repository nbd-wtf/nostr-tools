import PersistentWebSocket from 'pws'

export function relayConnect(url, onEventCallback) {
  if (url.length && url[url.length - 1] === '/') url = url.slice(0, -1)

  const ws = new PersistentWebSocket(url + '/ws?session=' + Math.random(), {
    pingTimeout: 30 * 1000
  })

  ws.onopen = () => console.log('connected to ', url)
  ws.onerror = err => console.log('error connecting', url, err)

  ws.onmessage = e => {
    let data = JSON.parse(e.data)
    if (data.length > 1) {
      if (data[0] === 'notice') {
        console.log('message from relay ' + url + ' :' + data[1])
      } else if (typeof data[0] === 'object') {
        onEventCallback(data[0], data[1])
      }
    }
  }

  return {
    url,
    subKey(key) {
      ws.send('sub-key:' + key)
    },
    unsubKey(key) {
      ws.send('unsub-key:' + key)
    },
    homeFeed(params = {}) {
      ws.send('req-feed:' + JSON.stringify(params))
    },
    reqEvent(params) {
      ws.send('req-key:' + JSON.stringify(params))
    },
    reqKey(params) {
      ws.send('req-key:' + JSON.stringify(params))
    },
    sendEvent(event) {
      ws.send(JSON.stringify(event))
    },
    close() {
      ws.close()
    }
  }
}
