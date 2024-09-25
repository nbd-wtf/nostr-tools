import { AbstractRelay } from './abstract-relay.ts';
/**
 * @deprecated use Relay.connect() instead.
 */
export declare function relayConnect(url: string): Promise<Relay>;
export declare function useWebSocketImplementation(websocketImplementation: any): void;
export declare class Relay extends AbstractRelay {
    constructor(url: string);
    static connect(url: string): Promise<Relay>;
}
export type RelayRecord = Record<string, {
    read: boolean;
    write: boolean;
}>;
export * from './abstract-relay.ts';
