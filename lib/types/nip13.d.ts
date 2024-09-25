import { type UnsignedEvent, type Event } from './pure.ts';
/** Get POW difficulty from a Nostr hex ID. */
export declare function getPow(hex: string): number;
/**
 * Mine an event with the desired POW. This function mutates the event.
 * Note that this operation is synchronous and should be run in a worker context to avoid blocking the main thread.
 *
 * Adapted from Snort: https://git.v0l.io/Kieran/snort/src/commit/4df6c19248184218c4c03728d61e94dae5f2d90c/packages/system/src/pow-util.ts#L14-L36
 */
export declare function minePow(unsigned: UnsignedEvent, difficulty: number): Omit<Event, 'sig'>;
