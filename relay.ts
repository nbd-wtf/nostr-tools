import { verifyEvent } from './pure.ts'
import { AbstractRelay } from './abstract-relay.ts'

/**
 * @deprecated use Relay.connect() instead.
 */
export function relayConnect(url: string): Promise<Relay> {
  return Relay.connect(url)
}

export class Relay extends AbstractRelay {
  constructor(url: string) {
    super(url, { verifyEvent })
  }

  static async connect(url: string): Promise<Relay> {
    const relay = new Relay(url)
    await relay.connect()
    return relay
  }
}

export * from './abstract-relay.ts'
