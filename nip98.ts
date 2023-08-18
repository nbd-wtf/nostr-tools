import {base64} from '@scure/base'
import {
  Event,
  EventTemplate,
  Kind,
  getBlankEvent,
  verifySignature
} from './event'
import {utf8Decoder, utf8Encoder} from './utils'

const _authorizationScheme = 'Nostr '

/**
 * Generate token for NIP-98 flow.
 *
 * @example
 * const sign = window.nostr.signEvent
 * await nip98.getToken('https://example.com/login', 'post', (e) => sign(e), true)
 */
export async function getToken(
  loginUrl: string,
  httpMethod: string,
  sign: <K extends number = number>(
    e: EventTemplate<K>
  ) => Promise<Event<K>> | Event<K>,
  includeAuthorizationScheme: boolean = false
): Promise<string> {
  if (!loginUrl || !httpMethod)
    throw new Error('Missing loginUrl or httpMethod')

  const event = getBlankEvent(Kind.HttpAuth)

  event.tags = [
    ['u', loginUrl],
    ['method', httpMethod]
  ]
  event.created_at = Math.round(new Date().getTime() / 1000)

  const signedEvent = await sign(event)

  const authorizationScheme = includeAuthorizationScheme
    ? _authorizationScheme
    : ''
  return (
    authorizationScheme +
    base64.encode(utf8Encoder.encode(JSON.stringify(signedEvent)))
  )
}

/**
 * Validate token for NIP-98 flow.
 *
 * @example
 * await nip98.validateToken('Nostr base64token', 'https://example.com/login', 'post')
 */
export async function validateToken(
  token: string,
  url: string,
  method: string
): Promise<boolean> {
  const event = await unpackEventFromToken(token).catch((error) => { throw(error) })
  const valid = await validateEvent(event, url, method).catch((error) => { throw(error) })

  return valid
}

export async function unpackEventFromToken(token: string): Promise<Event> {
  if (!token) {
    throw new Error('Missing token')
  }
  token = token.replace(_authorizationScheme, '')

  const eventB64 = utf8Decoder.decode(base64.decode(token))
  if (!eventB64 || eventB64.length === 0 || !eventB64.startsWith('{')) {
    throw new Error('Invalid token')
  }

  const event = JSON.parse(eventB64) as Event

  return event
}

export async function validateEvent(
  event: Event,
  url: string,
  method: string
): Promise<boolean> {
  if (!event) {
    throw new Error('Invalid nostr event')
  }
  if (!verifySignature(event)) {
    throw new Error('Invalid nostr event, signature invalid')
  }
  if (event.kind !== Kind.HttpAuth) {
    throw new Error('Invalid nostr event, kind invalid')
  }

  if (!event.created_at) {
    throw new Error('Invalid nostr event, created_at invalid')
  }

  // Event must be less than 60 seconds old
  if (Math.round(new Date().getTime() / 1000) - event.created_at > 60) {
    throw new Error('Invalid nostr event, expired')
  }

  const urlTag = event.tags.find(t => t[0] === 'u')
  if (urlTag?.length !== 1 && urlTag?.[1] !== url) {
    throw new Error('Invalid nostr event, url tag invalid')
  }

  const methodTag = event.tags.find(t => t[0] === 'method')
  if (
    methodTag?.length !== 1 &&
    methodTag?.[1].toLowerCase() !== method.toLowerCase()
  ) {
    throw new Error('Invalid nostr event, method tag invalid')
  }

  return true
}
