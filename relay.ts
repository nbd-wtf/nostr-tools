/* global WebSocket */

import { verifyEvent } from './pure.ts'
import { AbstractRelay, type AbstractRelayConstructorOptions } from './abstract-relay.ts'

var _WebSocket: typeof WebSocket

try {
  _WebSocket = WebSocket
} catch {}

export function useWebSocketImplementation(websocketImplementation: any) {
  _WebSocket = websocketImplementation
}

export class Relay extends AbstractRelay {
  constructor(
    url: string,
    options?: Pick<AbstractRelayConstructorOptions, 'enablePing' | 'enableReconnect' | 'idleTimeout'>,
  ) {
    super(url, { verifyEvent, websocketImplementation: _WebSocket, ...options })
  }

  static async connect(
    url: string,
    options?: Pick<AbstractRelayConstructorOptions, 'enablePing' | 'enableReconnect' | 'idleTimeout'> &
      Parameters<AbstractRelay['connect']>[0],
  ): Promise<Relay> {
    const relay = new Relay(url, options)
    await relay.connect(options)
    return relay
  }
}

export type RelayRecord = Record<string, { read: boolean; write: boolean }>

export * from './abstract-relay.ts'
