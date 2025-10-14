import { Filter } from './filter.ts'
import { AbstractRelay } from './relay.ts'

function sendNegentropyToRelay(open: boolean, relay: AbstractRelay, msg: string, filters: Filter[], subscriptionId?: any): void {
  const subId = subscriptionId || Math.random().toString(36).slice(2, 10)
  const parts: any[] = [open ? 'NEG-OPEN' : 'NEG-MSG', subId, ...filters, msg]
  relay.send(JSON.stringify(parts))
}

export function sendNegentropyMessage(relay: AbstractRelay, msg: string, filters: Filter[], subscriptionId?: any): void {
  sendNegentropyToRelay(false, relay, msg, filters, subscriptionId)
}

export function openNegentropyWithMessage(relay: AbstractRelay, msg: string, filters: Filter[], subscriptionId?: any): void {
  sendNegentropyToRelay(true, relay, msg, filters, subscriptionId)
}

export function closeNegentropy(relay: AbstractRelay, subscriptionId: string): void {
  const request = '["NEG-CLOSE","' + subscriptionId + '"]'
  relay.send(request)
}
