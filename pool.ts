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
  constructor(options?: { enablePing?: boolean }) {
    super({ verifyEvent, websocketImplementation: _WebSocket, ...options })
  }
}

export * from './abstract-pool.ts'
