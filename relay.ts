import { verifyEvent } from './pure.ts'
import { AbstractRelay } from './abstract-relay.ts'

export class Relay extends AbstractRelay {
  constructor(url: string) {
    super(url, { verifyEvent })
  }

  static async connect(url: string) {
    const relay = new Relay(url)
    await relay.connect()
    return relay
  }
}

export * from './abstract-relay.ts'
