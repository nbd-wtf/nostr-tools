import {getEventHash, signEvent} from './event'
import {relayConnect, normalizeRelayURL} from './relay'

export function relayPool() {
  var globalPrivateKey
  const poolPolicy = {
    // setting this to a number will cause events to be published to a random
    // set of relays only, instead of publishing to all relays all the time
    randomChoice: null
  }
  const relays = {}
  const noticeCallbacks = []

  function propagateNotice(notice, relayURL) {
    for (let i = 0; i < noticeCallbacks.length; i++) {
      let {relay} = relays[relayURL]
      noticeCallbacks[i](notice, relay)
    }
  }

  const activeSubscriptions = {}

  const sub = ({cb, filter}, id = Math.random().toString().slice(2)) => {
    const subControllers = Object.fromEntries(
      Object.values(relays)
        .filter(({policy}) => policy.read)
        .map(({relay}) => [
          relay.url,
          relay.sub({filter, cb: event => cb(event, relay.url)}, id)
        ])
    )

    const activeCallback = cb
    const activeFilters = filter

    const unsub = () => {
      Object.values(subControllers).forEach(sub => sub.unsub())
      delete activeSubscriptions[id]
    }
    const sub = ({cb = activeCallback, filter = activeFilters}) => {
      Object.entries(subControllers).map(([relayURL, sub]) => [
        relayURL,
        sub.sub({cb, filter}, id)
      ])
      return activeSubscriptions[id]
    }
    const addRelay = relay => {
      subControllers[relay.url] = relay.sub({cb, filter}, id)
      return activeSubscriptions[id]
    }
    const removeRelay = relayURL => {
      if (relayURL in subControllers) {
        subControllers[relayURL].unsub()
        if (Object.keys(subControllers).length === 0) unsub()
      }
      return activeSubscriptions[id]
    }

    activeSubscriptions[id] = {
      sub,
      unsub,
      addRelay,
      removeRelay
    }

    return activeSubscriptions[id]
  }

  return {
    sub,
    relays,
    setPrivateKey(privateKey) {
      globalPrivateKey = privateKey
    },
    setPolicy(key, value) {
      poolPolicy[key] = value
    },
    addRelay(url, policy = {read: true, write: true}) {
      let relayURL = normalizeRelayURL(url)
      if (relayURL in relays) return

      let relay = relayConnect(url, notice => {
        propagateNotice(notice, relayURL)
      })
      relays[relayURL] = {relay, policy}

      if (policy.read) {
        Object.values(activeSubscriptions).forEach(subscription =>
          subscription.addRelay(relay)
        )
      }

      return relay
    },
    removeRelay(url) {
      let relayURL = normalizeRelayURL(url)
      let data = relays[relayURL]
      if (!data) return

      let {relay} = data
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
    async publish(event, statusCallback = (status, relayURL) => {}) {
      event.id = getEventHash(event)

      if (!event.sig) {
        event.tags = event.tags || []

        if (globalPrivateKey) {
          event.sig = await signEvent(event, globalPrivateKey)
        } else {
          throw new Error(
            "can't publish unsigned event. either sign this event beforehand or pass a private key while initializing this relay pool so it can be signed automatically."
          )
        }
      }

      let writeable = Object.values(relays)
        .filter(({policy}) => policy.write)
        .sort(() => Math.random() - 0.5) // random

      let maxTargets = poolPolicy.randomChoice
        ? poolPolicy.randomChoice
        : writeable.length

      let successes = 0

      for (let i = 0; i < writeable.length; i++) {
        let {relay} = writeable[i]

        try {
          await new Promise(async (resolve, reject) => {
            try {
              await relay.publish(event, status => {
                statusCallback(status, relay.url)
                resolve()
              })
            } catch (err) {
              statusCallback(-1, relay.url)
            }
          })

          successes++
          if (successes >= maxTargets) {
            break
          }
        } catch (err) {
          /***/
        }
      }

      return event
    }
  }
}
