export declare function encrypt(secretKey: string | Uint8Array, pubkey: string, text: string): Promise<string>;
export declare function decrypt(secretKey: string | Uint8Array, pubkey: string, data: string): Promise<string>;
