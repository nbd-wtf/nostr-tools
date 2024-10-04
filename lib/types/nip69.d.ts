import { AbstractSimplePool } from "./abstract-pool.ts";
export type NofferData = {
    offer: string;
    amount?: number;
};
export type Nip69Success = {
    bolt11: string;
};
export type Nip69Error = {
    code: number;
    error: string;
    range: {
        min: number;
        max: number;
    };
};
export type Nip69Response = Nip69Success | Nip69Error;
export declare const SendNofferRequest: (pool: AbstractSimplePool, privateKey: Uint8Array, relays: string[], pubKey: string, data: NofferData) => Promise<Nip69Response>;
export declare const newNip69Event: (content: string, fromPub: string, toPub: string) => {
    content: string;
    created_at: number;
    kind: number;
    pubkey: string;
    tags: string[][];
};
export declare const newNip69Filter: (publicKey: string, eventId: string) => {
    since: number;
    kinds: number[];
    '#p': string[];
    '#e': string[];
};