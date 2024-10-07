import { AbstractSimplePool } from './abstract-pool.ts';
export type RecurringDebitTimeUnit = 'day' | 'week' | 'month';
export type BudgetFrequency = {
    number: number;
    unit: RecurringDebitTimeUnit;
};
export type NdebitData = {
    pointer?: string;
    amount_sats?: number;
    bolt11?: string;
    frequency?: BudgetFrequency;
};
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
export declare const SendNdebitRequest: (pool: AbstractSimplePool, privateKey: Uint8Array, relays: string[], pubKey: string, data: NdebitData, timeoutSeconds?: number) => Promise<Nip68Response>;
export declare const newFullAccessRequest: () => NdebitData;
export declare const newPaymentRequest: (invoice: string, amount?: number) => NdebitData;
export declare const newBudgetRequest: (frequency: BudgetFrequency, amount: number) => NdebitData;
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
