import {Kind, type EventTemplate, type Event} from './event.ts'
import {Relay} from './relay.ts'

/**
 * Authenticate via NIP-42 flow.
 *
 * @example
 * const sign = window.nostr.signEvent
 * relay.on('auth', challenge =>
 *   authenticate({ relay, sign, challenge })
 * )
 */
export const authenticate = async ({
  challenge,
  relay,
  sign
}: {
  challenge: string
  relay: Relay
  sign: <K extends number = number>(e: EventTemplate<K>) => Promise<Event<K>> | Event<K>
}): Promise<void> => {
  const e: EventTemplate = {
    kind: Kind.ClientAuth,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['relay', relay.url],
      ['challenge', challenge]
    ],
    content: ''
  }
  const pub = relay.auth(await sign(e))
  return new Promise((resolve, reject) => {
    pub.on('ok', function ok() {
      pub.off('ok', ok)
      resolve()
    })
    pub.on('failed', function fail(reason: string) {
      pub.off('failed', fail)
      reject(reason)
    })
  })
}
