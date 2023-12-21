import { verifyEvent } from './wasm.ts'
import TrustedRelay from './trusted-relay.ts'

export default class WasmRelay extends TrustedRelay {
  constructor(url: string) {
    super(url, { verifyEvent })
  }

  static async connect(url: string) {
    const relay = new WasmRelay(url)
    await relay.connect()
    return relay
  }
}

export * from './trusted-relay.ts'
