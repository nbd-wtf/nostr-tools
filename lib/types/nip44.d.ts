export declare function getConversationKey(privkeyA: Uint8Array, pubkeyB: string): Uint8Array;
declare function calcPaddedLen(len: number): number;
export declare function encrypt(plaintext: string, conversationKey: Uint8Array, nonce?: Uint8Array): string;
export declare function decrypt(payload: string, conversationKey: Uint8Array): string;
export declare const v2: {
    utils: {
        getConversationKey: typeof getConversationKey;
        calcPaddedLen: typeof calcPaddedLen;
    };
    encrypt: typeof encrypt;
    decrypt: typeof decrypt;
};
export {};
