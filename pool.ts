/* global WebSocket */

import { verifyEvent } from './pure.ts'
import { AbstractSimplePool } from './abstract-pool.ts'

var _WebSocket: typeof WebSocket

try {
  _WebSocket = WebSocket
} catch {}

export function useWebSocketImplementation(websocketImplementation: any) {
  _WebSocket = websocketImplementation
}

export class SimplePool extends AbstractSimplePool {
  constructor() {
    super({ verifyEvent, websocketImplementation: _WebSocket })
  }
}

export * from './abstract-pool.ts'
