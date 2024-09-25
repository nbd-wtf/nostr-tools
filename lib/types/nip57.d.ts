import { type Event, type EventTemplate } from './pure.ts';
export declare function useFetchImplementation(fetchImplementation: any): void;
export declare function getZapEndpoint(metadata: Event): Promise<null | string>;
export declare function makeZapRequest({ profile, event, amount, relays, comment, }: {
    profile: string;
    event: string | null;
    amount: number;
    comment: string;
    relays: string[];
}): EventTemplate;
export declare function validateZapRequest(zapRequestString: string): string | null;
export declare function makeZapReceipt({ zapRequest, preimage, bolt11, paidAt, }: {
    zapRequest: string;
    preimage?: string;
    bolt11: string;
    paidAt: Date;
}): EventTemplate;
