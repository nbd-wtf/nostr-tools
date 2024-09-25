import type { Event } from './core.ts';
export declare const utf8Decoder: TextDecoder;
export declare const utf8Encoder: TextEncoder;
export declare function normalizeURL(url: string): string;
export declare function insertEventIntoDescendingList(sortedArray: Event[], event: Event): Event[];
export declare function insertEventIntoAscendingList(sortedArray: Event[], event: Event): Event[];
export declare function binarySearch<T>(arr: T[], compare: (b: T) => number): [number, boolean];
export declare class QueueNode<V> {
    value: V;
    next: QueueNode<V> | null;
    prev: QueueNode<V> | null;
    constructor(message: V);
}
export declare class Queue<V> {
    first: QueueNode<V> | null;
    last: QueueNode<V> | null;
    constructor();
    enqueue(value: V): boolean;
    dequeue(): V | null;
}
