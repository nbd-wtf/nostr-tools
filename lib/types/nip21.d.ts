import { type DecodeResult } from './nip19.ts';
/** Nostr URI regex, eg `nostr:npub1...` */
export declare const NOSTR_URI_REGEX: RegExp;
/** Test whether the value is a Nostr URI. */
export declare function test(value: unknown): value is `nostr:${string}`;
/** Parsed Nostr URI data. */
export interface NostrURI {
    /** Full URI including the `nostr:` protocol. */
    uri: `nostr:${string}`;
    /** The bech32-encoded data (eg `npub1...`). */
    value: string;
    /** Decoded bech32 string, according to NIP-19. */
    decoded: DecodeResult;
}
/** Parse and decode a Nostr URI. */
export declare function parse(uri: string): NostrURI;
