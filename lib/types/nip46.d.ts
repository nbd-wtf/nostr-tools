import { UnsignedEvent, VerifiedEvent } from './core.ts';
import { AbstractSimplePool } from './abstract-pool.ts';
import type { RelayRecord } from './relay.ts';
export declare function useFetchImplementation(fetchImplementation: any): void;
export declare const BUNKER_REGEX: RegExp;
export type BunkerPointer = {
    relays: string[];
    pubkey: string;
    secret: null | string;
};
/** This takes either a bunker:// URL or a name@domain.com NIP-05 identifier
    and returns a BunkerPointer -- or null in case of error */
export declare function parseBunkerInput(input: string): Promise<BunkerPointer | null>;
export type BunkerSignerParams = {
    pool?: AbstractSimplePool;
    onauth?: (url: string) => void;
};
export declare class BunkerSigner {
    private pool;
    private subCloser;
    private isOpen;
    private serial;
    private idPrefix;
    private listeners;
    private waitingForAuth;
    private secretKey;
    bp: BunkerPointer;
    /**
     * Creates a new instance of the Nip46 class.
     * @param relays - An array of relay addresses.
     * @param remotePubkey - An optional remote public key. This is the key you want to sign as.
     * @param secretKey - An optional key pair.
     */
    constructor(clientSecretKey: Uint8Array, bp: BunkerPointer, params?: BunkerSignerParams);
    close(): Promise<void>;
    sendRequest(method: string, params: string[]): Promise<string>;
    /**
     * Calls the "connect" method on the bunker.
     * The promise will be rejected if the response is not "pong".
     */
    ping(): Promise<void>;
    /**
     * Calls the "connect" method on the bunker.
     */
    connect(): Promise<void>;
    /**
     * This was supposed to call the "get_public_key" method on the bunker,
     * but instead we just returns the public key we already know.
     */
    getPublicKey(): Promise<string>;
    /**
     * Calls the "get_relays" method on the bunker.
     */
    getRelays(): Promise<RelayRecord>;
    /**
     * Signs an event using the remote private key.
     * @param event - The event to sign.
     * @returns A Promise that resolves to the signed event.
     */
    signEvent(event: UnsignedEvent): Promise<VerifiedEvent>;
    nip04Encrypt(thirdPartyPubkey: string, plaintext: string): Promise<string>;
    nip04Decrypt(thirdPartyPubkey: string, ciphertext: string): Promise<string>;
    nip44GetKey(thirdPartyPubkey: string): Promise<Uint8Array>;
    nip44Encrypt(thirdPartyPubkey: string, plaintext: string): Promise<string>;
    nip44Decrypt(thirdPartyPubkey: string, ciphertext: string): Promise<string>;
}
/**
 * Creates an account with the specified username, domain, and optional email.
 * @param bunkerPubkey - The public key of the bunker to use for the create_account call.
 * @param username - The username for the account.
 * @param domain - The domain for the account.
 * @param email - The optional email for the account.
 * @param localSecretKey - Optionally pass a local secret key that will be used to communicate with the bunker,
                           this will default to generating a random key.
 * @throws Error if the email is present but invalid.
 * @returns A Promise that resolves to the auth_url that the client should follow to create an account.
 */
export declare function createAccount(bunker: BunkerProfile, params: BunkerSignerParams, username: string, domain: string, email?: string, localSecretKey?: Uint8Array): Promise<BunkerSigner>;
export declare const fetchCustodialBunkers: typeof fetchBunkerProviders;
/**
 * Fetches info on available providers that announce themselves using NIP-89 events.
 * @returns A promise that resolves to an array of available bunker objects.
 */
export declare function fetchBunkerProviders(pool: AbstractSimplePool, relays: string[]): Promise<BunkerProfile[]>;
export type BunkerProfile = {
    bunkerPointer: BunkerPointer;
    domain: string;
    nip05: string;
    name: string;
    picture: string;
    about: string;
    website: string;
    local: boolean;
};
