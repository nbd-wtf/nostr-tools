import { type VerifiedEvent } from './pure.ts';
interface NWCConnection {
    pubkey: string;
    relay: string;
    secret: string;
}
export declare function parseConnectionString(connectionString: string): NWCConnection;
export declare function makeNwcRequestEvent(pubkey: string, secretKey: Uint8Array, invoice: string): Promise<VerifiedEvent>;
export {};
