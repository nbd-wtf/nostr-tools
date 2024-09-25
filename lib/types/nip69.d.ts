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
