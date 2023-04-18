import {EventTemplate, Event, Kind} from './event'
import {Relay} from './relay'

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
  sign: (e: EventTemplate) => Promise<Event>
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
  const sub = relay.publish(await sign(e), 'AUTH')
  return new Promise((resolve, reject) => {
    sub.on('ok', function ok() {
      sub.off('ok', ok)
      resolve()
    })
    sub.on('failed', function fail(reason: string) {
      sub.off('failed', fail)
      reject(reason)
    })
  })
}
