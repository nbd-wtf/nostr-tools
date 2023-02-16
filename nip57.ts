import {bech32} from '@scure/base'

import {Event, EventTemplate} from './event'
import {utf8Decoder} from './utils'

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
    let {lud06, lud16} = JSON.parse(metadata.content)
    if (lud06) {
      let {words} = bech32.decode(lud06, 1000)
      let data = bech32.fromWords(words)
      lnurl = utf8Decoder.decode(data)
    } else if (lud16) {
      let [name, domain] = lud16.split('@')
      lnurl = `https://${domain}/.well-known/lnurlp/${name}`
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
  comment = ''
}: {
  profile: string
  event: string | null
  amount: number
  comment: string
  relays: string[]
}): EventTemplate {
  if (!amount) throw new Error('amount not given')
  if (!profile) throw new Error('profile not given')

  let zr = {
    kind: 9734,
    created_at: Math.round(Date.now() / 1000),
    content: comment,
    tags: [
      ['p', profile],
      ['amount', amount.toString()],
      ['relays', ...relays]
    ]
  }

  if (event) {
    zr.tags.push(['e', event])
  }

  return zr
}

export function makeZapReceipt({
  zapRequest,
  preimage,
  bolt11,
  paidAt
}: {
  zapRequest: string
  preimage: string | null
  bolt11: string
  paidAt: Date
}): EventTemplate {
  let zr: Event = JSON.parse(zapRequest)
  let tagsFromZapRequest = zr.tags.filter(
    ([t]) => t === 'e' || t === 'p' || t === 'a'
  )

  let zap = {
    kind: 9735,
    created_at: Math.round(paidAt.getTime() / 1000),
    content: '',
    tags: [
      ...tagsFromZapRequest,
      ['bolt11', bolt11],
      ['description', zapRequest]
    ]
  }

  if (preimage) {
    zap.tags.push(['preimage', preimage])
  }

  return zap
}
