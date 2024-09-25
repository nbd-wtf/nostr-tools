import { EventTemplate } from './core.ts';
/**
 * creates an EventTemplate for an AUTH event to be signed.
 */
export declare function makeAuthEvent(relayURL: string, challenge: string): EventTemplate;
