import { Event, EventTemplate } from './pure.ts';
/**
 * Generate token for NIP-98 flow.
 *
 * @example
 * const sign = window.nostr.signEvent
 * await nip98.getToken('https://example.com/login', 'post', (e) => sign(e), true)
 */
export declare function getToken(loginUrl: string, httpMethod: string, sign: (e: EventTemplate) => Promise<Event> | Event, includeAuthorizationScheme?: boolean, payload?: Record<string, any>): Promise<string>;
/**
 * Validate token for NIP-98 flow.
 *
 * @example
 * await nip98.validateToken('Nostr base64token', 'https://example.com/login', 'post')
 */
export declare function validateToken(token: string, url: string, method: string): Promise<boolean>;
/**
 * Unpacks an event from a token.
 *
 * @param token - The token to unpack.
 * @returns A promise that resolves to the unpacked event.
 * @throws {Error} If the token is missing, invalid, or cannot be parsed.
 */
export declare function unpackEventFromToken(token: string): Promise<Event>;
/**
 * Validates the timestamp of an event.
 * @param event - The event object to validate.
 * @returns A boolean indicating whether the event timestamp is within the last 60 seconds.
 */
export declare function validateEventTimestamp(event: Event): boolean;
/**
 * Validates the kind of an event.
 * @param event The event to validate.
 * @returns A boolean indicating whether the event kind is valid.
 */
export declare function validateEventKind(event: Event): boolean;
/**
 * Validates if the given URL matches the URL tag of the event.
 * @param event - The event object.
 * @param url - The URL to validate.
 * @returns A boolean indicating whether the URL is valid or not.
 */
export declare function validateEventUrlTag(event: Event, url: string): boolean;
/**
 * Validates if the given event has a method tag that matches the specified method.
 * @param event - The event to validate.
 * @param method - The method to match against the method tag.
 * @returns A boolean indicating whether the event has a matching method tag.
 */
export declare function validateEventMethodTag(event: Event, method: string): boolean;
/**
 * Calculates the hash of a payload.
 * @param payload - The payload to be hashed.
 * @returns The hash value as a string.
 */
export declare function hashPayload(payload: any): string;
/**
 * Validates the event payload tag against the provided payload.
 * @param event The event object.
 * @param payload The payload to validate.
 * @returns A boolean indicating whether the payload tag is valid.
 */
export declare function validateEventPayloadTag(event: Event, payload: any): boolean;
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
export declare function validateEvent(event: Event, url: string, method: string, body?: any): Promise<boolean>;
