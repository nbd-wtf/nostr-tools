/* global WebSocket */

import { verifyEvent } from './pure.ts'
import { AbstractRelay } from './abstract-relay.ts'

var _WebSocket: typeof WebSocket

try {
  _WebSocket = WebSocket
} catch {}

export function useWebSocketImplementation(websocketImplementation: any) {
  _WebSocket = websocketImplementation
}

export class Relay extends AbstractRelay {
  constructor(url: string, options?: { enablePing?: boolean }) {
    super(url, { verifyEvent, websocketImplementation: _WebSocket, ...options })
  }

  static async connect(url: string, options?: { enablePing?: boolean }): Promise<Relay> {
    const relay = new Relay(url, options)
    await relay.connect()
    return relay
  }
}

export type RelayRecord = Record<string, { read: boolean; write: boolean }>

export * from './abstract-relay.ts'
