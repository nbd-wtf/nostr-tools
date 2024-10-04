import type { Event, EventTemplate, VerifiedEvent, Nostr } from './core.ts';
import { type Filter } from './filter.ts';
export type AbstractRelayConstructorOptions = {
    verifyEvent: Nostr['verifyEvent'];
    websocketImplementation?: typeof WebSocket;
};
export declare class AbstractRelay {
    readonly url: string;
    private _connected;
    onclose: (() => void) | null;
    onnotice: (msg: string) => void;
    _onauth: ((challenge: string) => void) | null;
    baseEoseTimeout: number;
    connectionTimeout: number;
    openSubs: Map<string, Subscription>;
    private connectionTimeoutHandle;
    private connectionPromise;
    private openCountRequests;
    private openEventPublishes;
    private ws;
    private incomingMessageQueue;
    private queueRunning;
    private challenge;
    private serial;
    private verifyEvent;
    private _WebSocket;
    constructor(url: string, opts: AbstractRelayConstructorOptions);
    static connect(url: string, opts: AbstractRelayConstructorOptions): Promise<AbstractRelay>;
    private closeAllSubscriptions;
    get connected(): boolean;
    connect(): Promise<void>;
    private runQueue;
    private handleNext;
    send(message: string): Promise<void>;
    auth(signAuthEvent: (evt: EventTemplate) => Promise<VerifiedEvent>): Promise<string>;
    publish(event: Event): Promise<string>;
    count(filters: Filter[], params: {
        id?: string | null;
    }): Promise<number>;
    subscribe(filters: Filter[], params: Partial<SubscriptionParams>): Subscription;
    prepareSubscription(filters: Filter[], params: Partial<SubscriptionParams> & {
        id?: string;
    }): Subscription;
    close(): void;
    _onmessage(ev: MessageEvent<any>): void;
}
export declare class Subscription {
    readonly relay: AbstractRelay;
    readonly id: string;
    closed: boolean;
    eosed: boolean;
    filters: Filter[];
    alreadyHaveEvent: ((id: string) => boolean) | undefined;
    receivedEvent: ((relay: AbstractRelay, id: string) => void) | undefined;
    onevent: (evt: Event) => void;
    oneose: (() => void) | undefined;
    onclose: ((reason: string) => void) | undefined;
    eoseTimeout: number;
    private eoseTimeoutHandle;
    constructor(relay: AbstractRelay, id: string, filters: Filter[], params: SubscriptionParams);
    fire(): void;
    receivedEose(): void;
    close(reason?: string): void;
}
export type SubscriptionParams = {
    onevent?: (evt: Event) => void;
    oneose?: () => void;
    onclose?: (reason: string) => void;
    alreadyHaveEvent?: (id: string) => boolean;
    receivedEvent?: (relay: AbstractRelay, id: string) => void;
    eoseTimeout?: number;
};
export type CountResolver = {
    resolve: (count: number) => void;
    reject: (err: Error) => void;
};
export type EventPublishResolver = {
    resolve: (reason: string) => void;
    reject: (err: Error) => void;
};
