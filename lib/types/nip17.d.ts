import { NostrEvent } from './pure.ts';
import * as nip59 from './nip59.ts';
type Recipient = {
    publicKey: string;
    relayUrl?: string;
};
type ReplyTo = {
    eventId: string;
    relayUrl?: string;
};
export declare function wrapEvent(senderPrivateKey: Uint8Array, recipient: Recipient, message: string, conversationTitle?: string, replyTo?: ReplyTo): NostrEvent;
export declare function wrapManyEvents(senderPrivateKey: Uint8Array, recipients: Recipient[], message: string, conversationTitle?: string, replyTo?: ReplyTo): NostrEvent[];
export declare const unwrapEvent: typeof nip59.unwrapEvent;
export declare const unwrapManyEvents: typeof nip59.unwrapManyEvents;
export {};
