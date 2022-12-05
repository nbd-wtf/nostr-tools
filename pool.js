import { getEventHash, verifySignature, signEvent } from './event.js'
import { relayInit, normalizeRelayURL } from './relay.js'

export function relayPool() {
  var globalPrivateKey
  var globalSigningFunction

  const poolPolicy = {
    // setting this to a number will cause events to be published to a random
    // set of relays only, instead of publishing to all relays all the time
    randomChoice: null,

    // setting this to true will cause .publish() calls to wait until the event has
    // been published -- or at least attempted to be published -- to all relays
    wait: false
  }

  // map with all the relays where the url is the id
  // Map<string,{relay:Relay,policy:RelayPolicy>
  const relays = {}
  const activeSubscriptions = {}
  const poolListeners = { notice: [], connection: [], disconnection: [], error: [] }

  // sub creates a Subscription object {sub:Function, unsub:Function, addRelay:Function,removeRelay :Function }
  const sub = ({ filter, beforeSend, skipVerification }, id) => {

    // check if it has an id, if not assign one
    if (!id) id = Math.random().toString().slice(2)
    const subListeners = {}
    const subControllers = Object.fromEntries(
      // Convert the map<string,Relay> to a Relay[]
      Object.values(relays)
        // takes only relays that can be read
        .filter(({ policy }) => policy.read)
        // iterate all the relays and create the array [url:string,sub:SubscriptionCallback, listeners] 
        .map(({ relay }) => [
          relay.url,
          relay.sub({ filter, beforeSend, skipVerification }, id),
        ])
    )

    const activeFilters = filter // assigng filter for the suscrition
    const activeBeforeSend = beforeSend // assign before send fucntion
    const activeSkipVerification = skipVerification // assign skipVerification

    // Unsub deletes itself 
    const unsub = () => {
      // iterate the map of subControllers and call the unsub function of it relays 
      Object.values(subControllers).forEach(sub => sub.unsub())
      delete activeSubscriptions[id]
    }


    const sub = ({
      filter = activeFilters,
      beforeSend = activeBeforeSend,
      skipVerification = activeSkipVerification
    }) => {
      // Iterates the subControllers and add them the atributes of our Subscription (callback, filter,etc.)
      Object.entries(subControllers).forEach(([relayURL, sub]) => {
        sub.sub({ filter, beforeSend, skipVerification }, id)
      })

      // returns the current suscripcion
      return activeSubscriptions[id]
    }
    // addRelay adds a relay to the subControllers map so the current subscription can use it
    const addRelay = relay => {
      for (let type of Object.keys(subListeners)) {
        if (subListeners[type].length) subListeners[type].forEach(cb => relay.on(type, cb, id))
      }
      subControllers[relay.url] = relay.sub({ filter, beforeSend, skipVerification }, id) // TODO filter/before send should reference updated filter/beforesend
      return activeSubscriptions[id]
    }
    // removeRelay deletes a relay from the subControllers map, it also handles the unsubscription from the relay
    const removeRelay = relayURL => {
      if (relayURL in subControllers) {
        subControllers[relayURL].unsub()
        if (Object.keys(subControllers).length === 0) unsub()
      }
      return activeSubscriptions[id]
    }
    // on creates listener for sub ('EVENT', 'EOSE', etc)
    const on = (type, cb) => {
      subListeners[type].push(cb)
      Object.values(relays).forEach(({ relay }) => relay.on(type, cb, id))
      return activeSubscriptions[id]
    }
    // off destroys listener for sub ('EVENT', 'EOSE', etc)
    const off = (type, cb) => {
      if (!subListeners[type].length) return
      let index = subListeners[type].indexOf(cb)
      if (index !== -1) subListeners[type].splice(index, 1)
      Object.values(relays).forEach(({ relay }) => relay.off(type, cb, id))
      return activeSubscriptions[id]
    }

    // add the object created to activeSubscriptions map
    activeSubscriptions[id] = {
      sub,
      unsub,
      addRelay,
      removeRelay,
      on,
      off
    }

    return activeSubscriptions[id]
  }

  return {
    sub,
    relays,
    setPrivateKey(privateKey) {
      globalPrivateKey = privateKey
    },
    registerSigningFunction(fn) {
      globalSigningFunction = fn
    },
    setPolicy(key, value) {
      poolPolicy[key] = value
    },
    // addRelay adds a relay to the pool and to all its subscriptions
    addRelay(url, policy = { read: true, write: true }) {
      let relayURL = normalizeRelayURL(url)
      if (relayURL in relays) return

      let relay = relayInit(url)

      for (let type of Object.keys(poolListeners)) {
        let cbs = poolListeners[type] || []
        if (cbs.length) poolListeners[type].forEach(cb => relay.on(type, cb))
      }
      relay.connect()
      relays[relayURL] = { relay: relay, policy }

      if (policy.read) {
        Object.values(activeSubscriptions).forEach(subscription => {
          subscription.addRelay(relay)
        })
      }

      return relay
    },
    // remove relay deletes the relay from the pool and from all its subscriptions
    removeRelay(url) {
      let relayURL = normalizeRelayURL(url)
      let data = relays[relayURL]
      if (!data) return

      let { relay } = data
      Object.values(activeSubscriptions).forEach(subscription =>
        subscription.removeRelay(relay)
      )
      relay.close()
      delete relays[relayURL]
    },
    // getRelayList return an array with all the relays stored
    getRelayList() {
      return Object.values(relays)
    },

    relayChangePolicy(url, policy = { read: true, write: true }) {
      let relayURL = normalizeRelayURL(url)
      let data = relays[relayURL]
      if (!data) return

      relays[relayURL].policy = policy

      return relays[relayURL]
    },
    on(type, cb) {
      poolListeners[type] = poolListeners[type] || []
      poolListeners[type].push(cb)
      Object.values(relays).forEach(({ relay }) => relay.on(type, cb))
    },
    off(type, cb) {
      let index = poolListeners[type].indexOf(cb)
      if (index !== -1) poolListeners[type].splice(index, 1)
      Object.values(relays).forEach(({ relay }) => relay.off(type, cb))
    },

    // publish send a event to the relays 
    async publish(event, statusCallback) {
      event.id = getEventHash(event)

      // if the event is not signed then sign it 
      if (!event.sig) {
        event.tags = event.tags || []

        if (globalPrivateKey) {
          event.sig = await signEvent(event, globalPrivateKey)
        } else if (globalSigningFunction) {
          event.sig = await globalSigningFunction(event)
          if (!event.sig) {
            // abort here
            return
          } else {
            // check
            if (!(await verifySignature(event)))
              throw new Error(
                'signature provided by custom signing function is invalid.'
              )
          }
        } else {
          throw new Error(
            "can't publish unsigned event. either sign this event beforehand, provide a signing function or pass a private key while initializing this relay pool so it can be signed automatically."
          )
        }
      }

      // get the writable relays
      let writeable = Object.values(relays)
        .filter(({ policy }) => policy.write)
        .sort(() => Math.random() - 0.5) // random

      let maxTargets = poolPolicy.randomChoice
        ? poolPolicy.randomChoice
        : writeable.length

      let successes = 0

      // if the pool policy set to want until event send
      if (poolPolicy.wait) {
        for (let i = 0; i < writeable.length; i++) {
          let { relay } = writeable[i]

          try {
            await new Promise(async (resolve, reject) => {
              try {
                await relay.publish(event, status => {
                  if (statusCallback) statusCallback(status, relay.url)
                  resolve()
                })
              } catch (err) {
                if (statusCallback) statusCallback(-1, relay.url)
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
        // if the pool policy dont  want to wait  until event send
      } else {
        writeable.forEach(async ({ relay }) => {
          let callback = statusCallback
            ? status => statusCallback(status, relay.url)
            : null
          relay.publish(event, callback)
        })
      }

      return event
    }
  }
}
