import { Event } from './core.ts';
/** Get the expiration of the event as a `Date` object, if any. */
declare function getExpiration(event: Event): Date | undefined;
/** Check if the event has expired. */
declare function isEventExpired(event: Event): boolean;
/** Returns a promise that resolves when the event expires. */
declare function waitForExpire(event: Event): Promise<Event>;
/** Calls the callback when the event expires. */
declare function onExpire(event: Event, callback: (event: Event) => void): void;
export { getExpiration, isEventExpired, waitForExpire, onExpire };
