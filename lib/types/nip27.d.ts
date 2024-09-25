import { type NostrURI } from './nip21.ts';
/** Regex to find NIP-21 URIs inside event content. */
export declare const regex: () => RegExp;
/** Match result for a Nostr URI in event content. */
export interface NostrURIMatch extends NostrURI {
    /** Index where the URI begins in the event content. */
    start: number;
    /** Index where the URI ends in the event content. */
    end: number;
}
/** Find and decode all NIP-21 URIs. */
export declare function matchAll(content: string): Iterable<NostrURIMatch>;
/**
 * Replace all occurrences of Nostr URIs in the text.
 *
 * WARNING: using this on an HTML string is potentially unsafe!
 *
 * @example
 * ```ts
 * nip27.replaceAll(event.content, ({ decoded, value }) => {
 *   switch(decoded.type) {
 *     case 'npub':
 *       return renderMention(decoded)
 *     case 'note':
 *       return renderNote(decoded)
 *     default:
 *       return value
 *   }
 * })
 * ```
 */
export declare function replaceAll(content: string, replacer: (match: NostrURI) => string): string;
