import type { Event } from './core.ts';
import type { EventPointer, ProfilePointer } from './nip19.ts';
export type NIP10Result = {
    /**
     * Pointer to the root of the thread.
     */
    root: EventPointer | undefined;
    /**
     * Pointer to a "parent" event that parsed event replies to (responded to).
     */
    reply: EventPointer | undefined;
    /**
     * Pointers to events which may or may not be in the reply chain.
     */
    mentions: EventPointer[];
    /**
     * List of pubkeys that are involved in the thread in no particular order.
     */
    profiles: ProfilePointer[];
};
export declare function parse(event: Pick<Event, 'tags'>): NIP10Result;
