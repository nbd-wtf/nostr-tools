import WebSocket from 'ws'
import { verifyEvent } from './pure.ts'
import { AbstractRelay, WebSocketBase } from './abstract-relay.ts'

class NodeWs extends WebSocket implements WebSocketBase {
  constructor(url: string | URL, protocols?: string | string[] | undefined) {
    super(url, {
      protocol: Array.isArray(protocols) ? protocols[0] : protocols,
    })

    setInterval(() => {
      this.ping()
    }, 29000)
  }
}

export class NodeWsRelay extends AbstractRelay {
  constructor(url: string) {
    super(url, { verifyEvent, websocketImplementation: NodeWs })
  }

  static async connect(url: string): Promise<NodeWsRelay> {
    const relay = new NodeWsRelay(url)
    await relay.connect()
    return relay
  }
}

export * from './abstract-relay.ts'
