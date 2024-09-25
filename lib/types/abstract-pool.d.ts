import { AbstractRelay as AbstractRelay, SubscriptionParams, type AbstractRelayConstructorOptions } from './abstract-relay.ts';
import type { Event, Nostr } from './core.ts';
import { type Filter } from './filter.ts';
export type SubCloser = {
    close: () => void;
};
export type AbstractPoolConstructorOptions = AbstractRelayConstructorOptions & {};
export type SubscribeManyParams = Omit<SubscriptionParams, 'onclose' | 'id'> & {
    maxWait?: number;
    onclose?: (reasons: string[]) => void;
    id?: string;
};
export declare class AbstractSimplePool {
    protected relays: Map<string, AbstractRelay>;
    seenOn: Map<string, Set<AbstractRelay>>;
    trackRelays: boolean;
    verifyEvent: Nostr['verifyEvent'];
    trustedRelayURLs: Set<string>;
    private _WebSocket?;
    constructor(opts: AbstractPoolConstructorOptions);
    ensureRelay(url: string, params?: {
        connectionTimeout?: number;
    }): Promise<AbstractRelay>;
    close(relays: string[]): void;
    subscribeMany(relays: string[], filters: Filter[], params: SubscribeManyParams): SubCloser;
    subscribeManyMap(requests: {
        [relay: string]: Filter[];
    }, params: SubscribeManyParams): SubCloser;
    subscribeManyEose(relays: string[], filters: Filter[], params: Pick<SubscribeManyParams, 'id' | 'onevent' | 'onclose' | 'maxWait'>): SubCloser;
    querySync(relays: string[], filter: Filter, params?: Pick<SubscribeManyParams, 'id' | 'maxWait'>): Promise<Event[]>;
    get(relays: string[], filter: Filter, params?: Pick<SubscribeManyParams, 'id' | 'maxWait'>): Promise<Event | null>;
    publish(relays: string[], event: Event): Promise<string>[];
    listConnectionStatus(): Map<string, boolean>;
    destroy(): void;
}
