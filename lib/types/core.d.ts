export interface Nostr {
    generateSecretKey(): Uint8Array;
    getPublicKey(secretKey: Uint8Array): string;
    finalizeEvent(event: EventTemplate, secretKey: Uint8Array): VerifiedEvent;
    verifyEvent(event: Event): event is VerifiedEvent;
}
/** Designates a verified event signature. */
export declare const verifiedSymbol: unique symbol;
export interface Event {
    kind: number;
    tags: string[][];
    content: string;
    created_at: number;
    pubkey: string;
    id: string;
    sig: string;
    [verifiedSymbol]?: boolean;
}
export type NostrEvent = Event;
export type EventTemplate = Pick<Event, 'kind' | 'tags' | 'content' | 'created_at'>;
export type UnsignedEvent = Pick<Event, 'kind' | 'tags' | 'content' | 'created_at' | 'pubkey'>;
/** An event whose signature has been verified. */
export interface VerifiedEvent extends Event {
    [verifiedSymbol]: true;
}
export declare function validateEvent<T>(event: T): event is T & UnsignedEvent;
/**
 * Sort events in reverse-chronological order by the `created_at` timestamp,
 * and then by the event `id` (lexicographically) in case of ties.
 * This mutates the array.
 */
export declare function sortEvents(events: Event[]): Event[];
