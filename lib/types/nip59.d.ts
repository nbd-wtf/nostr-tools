import { UnsignedEvent, NostrEvent } from './core.ts';
type Rumor = UnsignedEvent & {
    id: string;
};
export declare function createRumor(event: Partial<UnsignedEvent>, privateKey: Uint8Array): Rumor;
export declare function createSeal(rumor: Rumor, privateKey: Uint8Array, recipientPublicKey: string): NostrEvent;
export declare function createWrap(seal: NostrEvent, recipientPublicKey: string): NostrEvent;
export declare function wrapEvent(event: Partial<UnsignedEvent>, senderPrivateKey: Uint8Array, recipientPublicKey: string): NostrEvent;
export declare function wrapManyEvents(event: Partial<UnsignedEvent>, senderPrivateKey: Uint8Array, recipientsPublicKeys: string[]): NostrEvent[];
export declare function unwrapEvent(wrap: NostrEvent, recipientPrivateKey: Uint8Array): Rumor;
export declare function unwrapManyEvents(wrappedEvents: NostrEvent[], recipientPrivateKey: Uint8Array): Rumor[];
export {};
