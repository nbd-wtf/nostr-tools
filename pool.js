import {getEventHash, signEvent} from './event'
import {relayConnect, normalizeRelayURL} from './relay'

const R = require('ramda')

export function relayPool(globalPrivateKey) {
  const relays = {}
  const globalSub = []
  const eventCallbacks = []
  const noticeCallbacks = []

  function propagateEvent(event, context, relayURL) {
    for (let i = 0; i < eventCallbacks.length; i++) {
      let {relay} = relays[relayURL]
      eventCallbacks[i](event, context, relay)
    }
  }
  function propagateNotice(notice, relayURL) {
    for (let i = 0; i < noticeCallbacks.length; i++) {
      let {relay} = relays[relayURL]
      noticeCallbacks[i](notice, relay)
    }
  }

  const sub = async (cb, params) => {
    const subControllers = R.map(relay => {
      return relay.sub(params, cb.bind(null, relay))
    }, R.filter(R.pipe(R.prop('policy'), R.prop('write'), R.equals(true)), relays))

    return {
      sub: (cb, params) =>
        R.map(
          R.pipe(R.prop('sub'), R.flip(R.apply)([cb, params])),
          subControllers
        ),
      unsub: () => R.map(R.pipe(R.prop('unsub'), R.call), subControllers)
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
    offEvent(cb) {
      let index = eventCallbacks.indexOf(cb)
      if (index !== -1) eventCallbacks.splice(index, 1)
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

      await R.map(async relay => {
        try {
          await relay.publish(event)
          statusCallback(0, relay.url)
          let {unsub} = relay.sub(
            () => {
              statusCallback(1, relay.url)
            },
            {id: event.id}
          )
          setTimeout(unsub, 5000)
        } catch (err) {
          statusCallback(-1, relay.url)
        }
      }, R.filter(R.pipe(R.prop('policy'), R.prop('write'), R.equals(true)), relays))

      return event
    }
  }
}
