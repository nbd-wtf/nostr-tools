import { type UnsignedEvent, type Event } from './pure.ts';
/** Get POW difficulty from a Nostr hex ID. */
export declare function getPow(hex: string): number;
/**
 * Mine an event with the desired POW. This function mutates the event.
 * Note that this operation is synchronous and should be run in a worker context to avoid blocking the main thread.
 */
export declare function minePow(unsigned: UnsignedEvent, difficulty: number): Omit<Event, 'sig'>;
export declare function fastEventHash(evt: UnsignedEvent): string;
