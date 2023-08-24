import {Kind, EventTemplate, Event} from './event'
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
  sign: <K extends number = number>(
    e: EventTemplate<K>
  ) => Promise<Event<K>> | Event<K>
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
  return relay.auth(await sign(e))
}
