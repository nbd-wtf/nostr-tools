import { AbstractSimplePool } from "./abstract-pool.ts";
export type RecurringDebitTimeUnit = 'day' | 'week' | 'month';
export type RecurringDebit = {
    frequency: {
        number: number;
        unit: RecurringDebitTimeUnit;
    };
    amount_sats: number;
};
export type SingleDebit = {
    pointer?: string;
    amount_sats?: number;
    bolt11: string;
    frequency?: undefined;
};
export type NdebitData = RecurringDebit | SingleDebit;
export type NdebitSuccess = {
    res: 'ok';
};
export type NdebitSuccessPayment = {
    res: 'ok';
    preimage: string;
};
export type NdebitFailure = {
    res: 'GFY';
    error: string;
    code: number;
};
export type Nip68Response = NdebitSuccess | NdebitSuccessPayment | NdebitFailure;
export declare const SendNdebitRequest: (pool: AbstractSimplePool, privateKey: Uint8Array, relays: string[], pubKey: string, data: NdebitData) => Promise<Nip68Response>;
export declare const newNip68Event: (content: string, fromPub: string, toPub: string) => {
    content: string;
    created_at: number;
    kind: number;
    pubkey: string;
    tags: string[][];
};
export declare const newNip68Filter: (publicKey: string, eventId: string) => {
    since: number;
    kinds: number[];
    '#p': string[];
    '#e': string[];
};
