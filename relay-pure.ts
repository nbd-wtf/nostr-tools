import { verifyEvent } from './pure.ts'
import TrustedRelay from './trusted-relay.ts'

export default class PureRelay extends TrustedRelay {
  constructor(url: string) {
    super(url, { verifyEvent })
  }

  static async connect(url: string) {
    const relay = new PureRelay(url)
    await relay.connect()
    return relay
  }
}

export * from './trusted-relay.ts'
