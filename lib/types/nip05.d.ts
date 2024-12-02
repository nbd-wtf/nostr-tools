import { ProfilePointer } from './nip19.ts';
export type Nip05 = `${string}@${string}`;
/**
 * NIP-05 regex. The localpart is optional, and should be assumed to be `_` otherwise.
 *
 * - 0: full match
 * - 1: name (optional)
 * - 2: domain
 */
export declare const NIP05_REGEX: RegExp;
export declare const isNip05: (value?: string | null) => value is Nip05;
export declare function useFetchImplementation(fetchImplementation: unknown): void;
export declare function searchDomain(domain: string, query?: string): Promise<{
    [name: string]: string;
}>;
export declare function queryProfile(fullname: string): Promise<ProfilePointer | null>;
export declare function isValid(pubkey: string, nip05: Nip05): Promise<boolean>;
