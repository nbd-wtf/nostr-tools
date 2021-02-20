import {getEventHash, signEvent} from './event'
import {relayConnect, normalizeRelayURL} from './relay'

export function relayPool(globalPrivateKey) {
  const relays = {}
  const globalSub = []
  const noticeCallbacks = []

  function propagateNotice(notice, relayURL) {
    for (let i = 0; i < noticeCallbacks.length; i++) {
      let {relay} = relays[relayURL]
      noticeCallbacks[i](notice, relay)
    }
  }

  const activeSubscriptions = {}

  const sub = async (id, {cb, filter}) => {
    const subControllers = Object.fromEntries(
      Object.values(relays)
        .filter(({policy}) => policy.read)
        .map(({relay}) => [
          relay.url,
          relay.sub({filter, cb: event => cb(event, relay)})
        ])
    )

    activeSubscriptions[id] = {
      sub: ({cb = cb, filter = filter}) =>
        Object.entries(subControllers).map(([relayURL, sub]) => [
          relayURL,
          sub(id, {cb, filter})
        ]),
      addRelay: relay => {
        subControllers[relay.url] = relay.sub({cb, filter})
      },
      removeRelay: relayURL => {
        subControllers[relayURL].unsub()
        if (Object.keys(subControllers).length === 0) unsub()
      },
      unsub: () => {
        Object.values(subControllers).forEach(sub => sub.unsub())
        delete activeSubscriptions[id]
      }
    }

    return activeSubscriptions[id]
  }

  return {
    sub: sub.bind(null, Math.random()),
    relays,
    setPrivateKey(privateKey) {
      globalPrivateKey = privateKey
    },
    async addRelay(url, policy = {read: true, write: true}) {
      let relayURL = normalizeRelayURL(url)
      if (relayURL in relays) return

      let relay = await relayConnect(url, notice => {
        propagateNotice(notice, relayURL)
      })
      relays[relayURL] = {relay, policy}

      Object.values(activeSubscriptions).forEach(subscription =>
        subscription.addRelay(relay)
      )

      return relay
    },
    removeRelay(url) {
      let relayURL = normalizeRelayURL(url)
      let {relay} = relays[relayURL]
      if (!relay) return
      Object.values(activeSubscriptions).forEach(subscription =>
        subscription.removeRelay(relay)
      )
      relay.close()
      delete relays[relayURL]
    },
    onNotice(cb) {
      noticeCallbacks.push(cb)
    },
    offNotice(cb) {
      let index = noticeCallbacks.indexOf(cb)
      if (index !== -1) noticeCallbacks.splice(index, 1)
    },
    async publish(event, statusCallback) {
      if (!event.sig) {
        event.tags = event.tags || []

        if (globalPrivateKey) {
          event.id = await getEventHash(event)
          event.sig = await signEvent(event, globalPrivateKey)
        } else {
          throw new Error(
            "can't publish unsigned event. either sign this event beforehand or pass a private key while initializing this relay pool so it can be signed automatically."
          )
        }
      }

      Object.values(relays)
        .filter(({policy}) => policy.write)
        .map(async ({relay}) => {
          try {
            await relay.publish(event)
            statusCallback(0, relay.url)
            let {unsub} = relay.sub({
              cb: () => {
                statusCallback(1, relay.url)
              },
              filter: {id: event.id}
            })
            setTimeout(unsub, 5000)
          } catch (err) {
            statusCallback(-1, relay.url)
          }
        })

      return event
    }
  }
}
