import { bech32 } from '@scure/base'

import { validateEvent, verifyEvent, type Event, type EventTemplate } from './pure.ts'
import { utf8Decoder } from './utils.ts'

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

export function makeZapRequest({
  profile,
  event,
  amount,
  relays,
  comment = '',
}: {
  profile: string
  event: string | null
  amount: number
  comment: string
  relays: string[]
}): EventTemplate {
  if (!amount) throw new Error('amount not given')
  if (!profile) throw new Error('profile not given')

  let zr: EventTemplate = {
    kind: 9734,
    created_at: Math.round(Date.now() / 1000),
    content: comment,
    tags: [
      ['p', profile],
      ['amount', amount.toString()],
      ['relays', ...relays],
    ],
  }

  if (event) {
    zr.tags.push(['e', event])
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
