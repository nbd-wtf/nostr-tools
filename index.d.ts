import { type Buffer } from 'buffer';

// these should be available from the native @noble/secp256k1 type
// declarations, but they somehow aren't so instead: copypasta
declare type Hex = Uint8Array | string;
declare type PrivKey = Hex | bigint | number;

declare enum EventKind {
    Metadata = 0,
    Text = 1,
    RelayRec = 2,
    Contacts = 3,
    DM = 4,
    Deleted = 5,
}

// event.js
declare type Event = {
    kind: EventKind,
    pubkey?: string,
    content: string,
    tags: string[],
    created_at: number,
};

declare function getBlankEvent(): Event;
declare function serializeEvent(event: Event): string;
declare function getEventHash(event: Event): string;
declare function validateEvent(event: Event): boolean;
declare function validateSignature(event: Event): boolean;
declare function signEvent(event: Event, key: PrivKey): Promise<[Uint8Array, number]>;

// filter.js
declare type Filter = {
    ids: string[],
    kinds: EventKind[],
    authors: string[],
    since: number,
    until: number,
    "#e": string[],
    "#p": string[],
};

declare function matchFilter(filter: Filter, event: Event): boolean;
declare function matchFilters(filters: Filter[], event: Event): boolean;

// general
declare type ClientMessage =
    ["EVENT", Event] |
    ["REQ", string, Filter[]] |
    ["CLOSE", string];

declare type ServerMessage =
    ["EVENT", string, Event] |
    ["NOTICE", unknown];

// keys.js
declare function generatePrivateKey(): string;
declare function getPublicKey(privateKey: Buffer): string;

// pool.js
declare type RelayPolicy = {
    read: boolean,
    write: boolean,
};

declare type SubscriptionCallback = (event: Event, relay: string) => void;

declare type SubscriptionOptions = {
    cb: SubscriptionCallback,
    filter: Filter,
    skipVerification: boolean
    // TODO: thread through how `beforeSend` actually works before trying to type it
    // beforeSend(event: Event): 
};

declare type Subscription = {
    unsub(): void,
};

declare type PublishCallback = (status: number) => void;

// relay.js
declare type Relay = {
    url: string,
    sub: SubscriptionCallback,
    publish: (event: Event, cb: PublishCallback) => Promise<Event>,
};

declare type PoolPublishCallback = (status: number, relay: string) => void;

declare type RelayPool = {
    setPrivateKey(key: string): void,
    addRelay(url: string, opts?: RelayPolicy): Relay,
    sub(opts: SubscriptionOptions, id?: string): Subscription,
    publish(event: Event, cb: PoolPublishCallback): Promise<Event>,
    close: () => void,
    status: number,
};

declare function relayPool(): RelayPool;

// nip04.js

// nip05.js

// nip06.js
