import { Nostr as NostrWasm } from 'nostr-wasm';
import { EventTemplate, Event, VerifiedEvent } from './core.ts';
export declare function setNostrWasm(x: NostrWasm): void;
export declare const generateSecretKey: () => Uint8Array;
export declare const getPublicKey: (secretKey: Uint8Array) => string;
export declare const finalizeEvent: (t: EventTemplate, secretKey: Uint8Array) => VerifiedEvent;
export declare const verifyEvent: (event: Event) => event is VerifiedEvent;
export * from './core.ts';
