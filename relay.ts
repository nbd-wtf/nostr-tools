/* global WebSocket */

import { verifyEvent } from './pure.ts'
import { AbstractRelay, WebSocketBaseConn } from './abstract-relay.ts'

class BrowserWs extends WebSocket implements WebSocketBase, WebSocketBaseConn {}

export class Relay extends AbstractRelay {
  constructor(url: string) {
    super(url, { verifyEvent, websocketImplementation: BrowserWs })
  }

  static async connect(url: string): Promise<Relay> {
    const relay = new Relay(url)
    await relay.connect()
    return relay
  }
}

export * from './abstract-relay.ts'
