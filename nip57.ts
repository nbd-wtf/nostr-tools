import { bech32 } from '@scure/base'

import { NostrEvent, validateEvent, verifyEvent, type Event, type EventTemplate } from './pure.ts'
import { utf8Decoder } from './utils.ts'
import { isReplaceableKind, isAddressableKind } from './kinds.ts'

var _fetch: any

try {
  _fetch = fetch
} catch {}

export function useFetchImplementation(fetchImplementation: any) {
  _fetch = fetchImplementation
}

export async function getZapEndpoint(metadata: Event): Promise<null | string> {
  try {
    let lnurl: string = ''
    let { lud06, lud16 } = JSON.parse(metadata.content)
    if (lud06) {
      let { words } = bech32.decode(lud06, 1000)
      let data = bech32.fromWords(words)
      lnurl = utf8Decoder.decode(data)
    } else if (lud16) {
      let [name, domain] = lud16.split('@')
      lnurl = new URL(`/.well-known/lnurlp/${name}`, `https://${domain}`).toString()
    } else {
      return null
    }

    let res = await _fetch(lnurl)
    let body = await res.json()

    if (body.allowsNostr && body.nostrPubkey) {
      return body.callback
    }
  } catch (err) {
    /*-*/
  }

  return null
}

type ProfileZap = {
  pubkey: string
  amount: number
  comment?: string
  relays: string[]
}

type EventZap = {
  event: NostrEvent
  amount: number
  comment?: string
  relays: string[]
}

export function makeZapRequest(params: ProfileZap | EventZap): EventTemplate {
  let zr: EventTemplate = {
    kind: 9734,
    created_at: Math.round(Date.now() / 1000),
    content: params.comment || '',
    tags: [
      ['p', 'pubkey' in params ? params.pubkey : params.event.pubkey],
      ['amount', params.amount.toString()],
      ['relays', ...params.relays],
    ],
  }

  if ('event' in params) {
    zr.tags.push(['e', params.event.id])
    if (isReplaceableKind(params.event.kind)) {
      const a = ['a', `${params.event.kind}:${params.event.pubkey}:`]
      zr.tags.push(a)
    } else if (isAddressableKind(params.event.kind)) {
      let d = params.event.tags.find(([t, v]) => t === 'd' && v)
      if (!d) throw new Error('d tag not found or is empty')
      const a = ['a', `${params.event.kind}:${params.event.pubkey}:${d[1]}`]
      zr.tags.push(a)
    }
    zr.tags.push(['k', params.event.kind.toString()])
  }

  return zr
}

export function validateZapRequest(zapRequestString: string): string | null {
  let zapRequest: Event

  try {
    zapRequest = JSON.parse(zapRequestString)
  } catch (err) {
    return 'Invalid zap request JSON.'
  }

  if (!validateEvent(zapRequest)) return 'Zap request is not a valid Nostr event.'

  if (!verifyEvent(zapRequest)) return 'Invalid signature on zap request.'

  let p = zapRequest.tags.find(([t, v]) => t === 'p' && v)
  if (!p) return "Zap request doesn't have a 'p' tag."
  if (!p[1].match(/^[a-f0-9]{64}$/)) return "Zap request 'p' tag is not valid hex."

  let e = zapRequest.tags.find(([t, v]) => t === 'e' && v)
  if (e && !e[1].match(/^[a-f0-9]{64}$/)) return "Zap request 'e' tag is not valid hex."

  let relays = zapRequest.tags.find(([t, v]) => t === 'relays' && v)
  if (!relays) return "Zap request doesn't have a 'relays' tag."

  return null
}

export function makeZapReceipt({
  zapRequest,
  preimage,
  bolt11,
  paidAt,
}: {
  zapRequest: string
  preimage?: string
  bolt11: string
  paidAt: Date
}): EventTemplate {
  let zr: Event = JSON.parse(zapRequest)
  let tagsFromZapRequest = zr.tags.filter(([t]) => t === 'e' || t === 'p' || t === 'a')

  let zap: EventTemplate = {
    kind: 9735,
    created_at: Math.round(paidAt.getTime() / 1000),
    content: '',
    tags: [...tagsFromZapRequest, ['P', zr.pubkey], ['bolt11', bolt11], ['description', zapRequest]],
  }

  if (preimage) {
    zap.tags.push(['preimage', preimage])
  }

  return zap
}

export function getSatoshisAmountFromBolt11(bolt11: string): number {
  if (bolt11.length < 50) {
    return 0
  }
  bolt11 = bolt11.substring(0, 50)
  const idx = bolt11.lastIndexOf('1')
  if (idx === -1) {
    return 0
  }
  const hrp = bolt11.substring(0, idx)
  if (!hrp.startsWith('lnbc')) {
    return 0
  }
  const amount = hrp.substring(4) // equivalent to strings.CutPrefix

  if (amount.length < 1) {
    return 0
  }

  // if last character is a digit, then the amount can just be interpreted as BTC
  const char = amount[amount.length - 1]
  const digit = char.charCodeAt(0) - '0'.charCodeAt(0)
  const isDigit = digit >= 0 && digit <= 9

  let cutPoint = amount.length - 1
  if (isDigit) {
    cutPoint++
  }

  if (cutPoint < 1) {
    return 0
  }

  const num = parseInt(amount.substring(0, cutPoint))

  switch (char) {
    case 'm':
      return num * 100000
    case 'u':
      return num * 100
    case 'n':
      return num / 10
    case 'p':
      return num / 10000
    default:
      return num * 100000000
  }
}
