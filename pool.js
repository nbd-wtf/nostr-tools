import {getEventHash, signEvent} from './event'
import {relayConnect, normalizeRelayURL} from './relay'

export function relayPool(globalPrivateKey) {
  const relays = {}
  const globalSub = []
  const attemptCallbacks = []
  const eventCallbacks = []
  const noticeCallbacks = []

  function propagateEvent(context, event, relayURL) {
    for (let i = 0; i < eventCallbacks.length; i++) {
      let {relay} = relays[relayURL]
      eventCallbacks[i](context, event, relay)
    }
  }
  function propagateNotice(notice, relayURL) {
    for (let i = 0; i < noticeCallbacks.length; i++) {
      let {relay} = relays[relayURL]
      noticeCallbacks[i](notice, relay)
    }
  }
  function propagateAttempt(eventId, status, relayURL) {
    for (let i = 0; i < attemptCallbacks.length; i++) {
      let {relay} = relays[relayURL]
      attemptCallbacks[i](eventId, status, relay)
    }
  }

  async function relaysEach(fn, policyFilter) {
    for (let relayURL in relays) {
      let {relay, policy} = relays[relayURL]
      if (policyFilter.write && policy.write) {
        await fn(relay)
      } else if (policyFilter.read && policy.read) {
        await fn(relays)
      }
    }
  }

  return {
    relays,
    setPrivateKey(privateKey) {
      globalPrivateKey = privateKey
    },
    addRelay(url, policy = {read: true, write: true}) {
      let relayURL = normalizeRelayURL(url)
      if (relayURL in relays) return

      let relay = relayConnect(
        url,
        (context, event) => {
          propagateEvent(context, event, relayURL)
        },
        notice => {
          propagateNotice(notice, relayURL)
        }
      )
      relays[relayURL] = {relay, policy}

      // automatically subscribe to everybody on this
      for (let key in globalSub) {
        relay.subKey(key)
      }

      return relay
    },
    removeRelay(url) {
      let relayURL = normalizeRelayURL(url)
      let {relay} = relays[relayURL]
      if (!relay) return
      relay.close()
      delete relays[relayURL]
    },
    onEvent(cb) {
      eventCallbacks.push(cb)
    },
    offEvent(cb) {
      let index = eventCallbacks.indexOf(cb)
      if (index !== -1) eventCallbacks.splice(index, 1)
    },
    onNotice(cb) {
      noticeCallbacks(cb)
    },
    offNotice(cb) {
      let index = noticeCallbacks.indexOf(cb)
      if (index !== -1) noticeCallbacks.splice(index, 1)
    },
    onAttempt(cb) {
      attemptCallbacks(cb)
    },
    offAttempt(cb) {
      let index = attemptCallbacks.indexOf(cb)
      if (index !== -1) attemptCallbacks.splice(index, 1)
    },
    async publish(event) {
      if (!event.signature) {
        event.tags = event.tags || []

        if (globalPrivateKey) {
          event.id = getEventHash(event)
          event.signature = await signEvent(event, globalPrivateKey)
        } else {
          throw new Error(
            "can't publish unsigned event. either sign this event beforehand or pass a private key while initializing this relay pool so it can be signed automatically."
          )
        }
      }

      await relaysEach(
        async relay => {
          try {
            await relay.publish(event)
            propagateAttempt(event.id, 'sent', relay.url)
          } catch (err) {
            propagateAttempt(event.id, 'failed', relay.url)
          }
        },
        {write: true}
      )

      return event
    },
    async subKey(key) {
      globalSub[key] = true
      await relaysEach(async relay => relay.subKey(key), {read: true})
    },
    async unsubKey(key) {
      delete globalSub[key]
      await relaysEach(async relay => relay.unsubKey(key), {read: true})
    },
    async reqFeed(params = {}) {
      await relaysEach(async relay => relay.reqFeed(params), {read: true})
    },
    async reqEvent(params) {
      await relaysEach(async relay => relay.reqEvent(params), {read: true})
    },
    async reqKey(params) {
      await relaysEach(async relay => relay.reqKey(params), {read: true})
    }
  }
}
