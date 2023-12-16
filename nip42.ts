import { type EventTemplate, type Event } from './event.ts'
import { ClientAuth } from './kinds.ts'
import { Relay } from './relay.ts'

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
  sign,
}: {
  challenge: string
  relay: Relay
  sign: (e: EventTemplate) => Promise<Event> | Event
}): Promise<void> => {
  const evt: EventTemplate = {
    kind: ClientAuth,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['relay', relay.url],
      ['challenge', challenge],
    ],
    content: '',
  }
  return relay.auth(await sign(evt))
}
