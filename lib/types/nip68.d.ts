import { AbstractSimplePool } from "./abstract-pool.ts";
type RecurringDebitTimeUnit = 'day' | 'week' | 'month';
type RecurringDebit = {
    frequency: {
        number: number;
        unit: RecurringDebitTimeUnit;
    };
    amount_sats: number;
};
export type NdebitData = {
    pointer?: string;
    amount_sats: number;
} & (RecurringDebit | {
    bolt11: string;
});
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
export {};
