/// <reference types="mock-socket/index.js" />
import { WebSocket } from 'mock-socket';
import { type Event } from './pure.ts';
export declare const MockWebSocketClient: typeof WebSocket;
export declare function buildEvent(params: Partial<Event>): Event;
export declare class MockRelay {
    private _server;
    url: string;
    secretKeys: Uint8Array[];
    preloadedEvents: Event[];
    constructor(url?: string | undefined);
    get authors(): string[];
    get ids(): string[];
}
