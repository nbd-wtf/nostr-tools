import { Event } from './pure.ts';
import { EventPointer } from './nip19.ts';
export type RepostEventTemplate = {
    /**
     * Pass only non-nip18 tags if you have to.
     * Nip18 tags ('e' and 'p' tags pointing to the reposted event) will be added automatically.
     */
    tags?: string[][];
    /**
     * Pass an empty string to NOT include the stringified JSON of the reposted event.
     * Any other content will be ignored and replaced with the stringified JSON of the reposted event.
     * @default Stringified JSON of the reposted event
     */
    content?: '';
    created_at: number;
};
export declare function finishRepostEvent(t: RepostEventTemplate, reposted: Event, relayUrl: string, privateKey: Uint8Array): Event;
export declare function getRepostedEventPointer(event: Event): undefined | EventPointer;
export type GetRepostedEventOptions = {
    skipVerification?: boolean;
};
export declare function getRepostedEvent(event: Event, { skipVerification }?: GetRepostedEventOptions): undefined | Event;
