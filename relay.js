import PersistentWebSocket from 'pws'

export function relayConnect(url, onEventCallback) {
  if (url.length && url[url.length - 1] === '/') url = url.slice(0, -1)

  const ws = new PersistentWebSocket(url + '/ws?session=' + Math.random(), {
    pingTimeout: 30 * 1000
  })

  ws.onopen = () => console.log('connected to ', url)
  ws.onerror = err => console.log('error connecting', url, err)

  ws.onmessage = e => {
    let event = JSON.parse(e.data)
    event.context
  }

  return {
    url,
    subscribe() {},
    request() {},
    publish() {},
    close() {
      ws.close()
    }
  }
}
