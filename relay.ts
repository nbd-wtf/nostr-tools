/* global WebSocket */

import { verifyEvent } from './pure.ts'
import { AbstractRelay } from './abstract-relay.ts'

/**
 * @deprecated use Relay.connect() instead.
 */
export function relayConnect(url: string): Promise<Relay> {
  return Relay.connect(url)
}

var _WebSocket: typeof WebSocket

try {
  _WebSocket = WebSocket
} catch {}

export function useWebSocketImplementation(websocketImplementation: any) {
  _WebSocket = websocketImplementation
}

export class Relay extends AbstractRelay {
  constructor(url: string) {
    super(url, { verifyEvent, websocketImplementation: _WebSocket })
  }

  static async connect(url: string): Promise<Relay> {
    const relay = new Relay(url)
    await relay.connect()
    return relay
  }
}

export type RelayRecord = Record<string, { read: boolean; write: boolean }>

export * from './abstract-relay.ts'
