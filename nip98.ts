import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/hashes/utils'
import { base64 } from '@scure/base'

import { HTTPAuth } from './kinds.ts'
import { Event, EventTemplate, verifyEvent } from './pure.ts'
import { utf8Decoder, utf8Encoder } from './utils.ts'

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
  sign: (e: EventTemplate) => Promise<Event> | Event,
  includeAuthorizationScheme: boolean = false,
  payload?: Record<string, any>,
): Promise<string> {
  const event: EventTemplate = {
    kind: HTTPAuth,
    tags: [
      ['u', loginUrl],
      ['method', httpMethod],
    ],
    created_at: Math.round(new Date().getTime() / 1000),
    content: '',
  }

  if (payload) {
    event.tags.push(['payload', hashPayload(payload)])
  }

  const signedEvent = await sign(event)
  const authorizationScheme = includeAuthorizationScheme ? _authorizationScheme : ''

  return authorizationScheme + base64.encode(utf8Encoder.encode(JSON.stringify(signedEvent)))
}

/**
 * Validate token for NIP-98 flow.
 *
 * @example
 * await nip98.validateToken('Nostr base64token', 'https://example.com/login', 'post')
 */
export async function validateToken(token: string, url: string, method: string): Promise<boolean> {
  const event = await unpackEventFromToken(token).catch(error => {
    throw error
  })

  const valid = await validateEvent(event, url, method).catch(error => {
    throw error
  })

  return valid
}

/**
 * Unpacks an event from a token.
 *
 * @param token - The token to unpack.
 * @returns A promise that resolves to the unpacked event.
 * @throws {Error} If the token is missing, invalid, or cannot be parsed.
 */
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

/**
 * Validates the timestamp of an event.
 * @param event - The event object to validate.
 * @returns A boolean indicating whether the event timestamp is within the last 60 seconds.
 */
export function validateEventTimestamp(event: Event): boolean {
  if (!event.created_at) {
    return false
  }

  return Math.round(new Date().getTime() / 1000) - event.created_at < 60
}

/**
 * Validates the kind of an event.
 * @param event The event to validate.
 * @returns A boolean indicating whether the event kind is valid.
 */
export function validateEventKind(event: Event): boolean {
  return event.kind === HTTPAuth
}

/**
 * Validates if the given URL matches the URL tag of the event.
 * @param event - The event object.
 * @param url - The URL to validate.
 * @returns A boolean indicating whether the URL is valid or not.
 */
export function validateEventUrlTag(event: Event, url: string): boolean {
  const urlTag = event.tags.find(t => t[0] === 'u')

  if (!urlTag) {
    return false
  }

  return urlTag.length > 0 && urlTag[1] === url
}

/**
 * Validates if the given event has a method tag that matches the specified method.
 * @param event - The event to validate.
 * @param method - The method to match against the method tag.
 * @returns A boolean indicating whether the event has a matching method tag.
 */
export function validateEventMethodTag(event: Event, method: string): boolean {
  const methodTag = event.tags.find(t => t[0] === 'method')

  if (!methodTag) {
    return false
  }

  return methodTag.length > 0 && methodTag[1].toLowerCase() === method.toLowerCase()
}

/**
 * Calculates the hash of a payload.
 * @param payload - The payload to be hashed.
 * @returns The hash value as a string.
 */
export function hashPayload(payload: any): string {
  const hash = sha256(utf8Encoder.encode(JSON.stringify(payload)))
  return bytesToHex(hash)
}

/**
 * Validates the event payload tag against the provided payload.
 * @param event The event object.
 * @param payload The payload to validate.
 * @returns A boolean indicating whether the payload tag is valid.
 */
export function validateEventPayloadTag(event: Event, payload: any): boolean {
  const payloadTag = event.tags.find(t => t[0] === 'payload')

  if (!payloadTag) {
    return false
  }

  const payloadHash = hashPayload(payload)
  return payloadTag.length > 0 && payloadTag[1] === payloadHash
}

/**
 * Validates a Nostr event for the NIP-98 flow.
 *
 * @param event - The Nostr event to validate.
 * @param url - The URL associated with the event.
 * @param method - The HTTP method associated with the event.
 * @param body - The request body associated with the event (optional).
 * @returns A promise that resolves to a boolean indicating whether the event is valid.
 * @throws An error if the event is invalid.
 */
export async function validateEvent(event: Event, url: string, method: string, body?: any): Promise<boolean> {
  if (!verifyEvent(event)) {
    throw new Error('Invalid nostr event, signature invalid')
  }

  if (!validateEventKind(event)) {
    throw new Error('Invalid nostr event, kind invalid')
  }

  if (!validateEventTimestamp(event)) {
    throw new Error('Invalid nostr event, created_at timestamp invalid')
  }

  if (!validateEventUrlTag(event, url)) {
    throw new Error('Invalid nostr event, url tag invalid')
  }

  if (!validateEventMethodTag(event, method)) {
    throw new Error('Invalid nostr event, method tag invalid')
  }

  if (Boolean(body) && typeof body === 'object' && Object.keys(body).length > 0) {
    if (!validateEventPayloadTag(event, body)) {
      throw new Error('Invalid nostr event, payload tag does not match request body hash')
    }
  }

  return true
}
