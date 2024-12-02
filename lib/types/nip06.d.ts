export declare function privateKeyFromSeedWords(mnemonic: string, passphrase?: string, accountIndex?: number): Uint8Array;
export declare function accountFromSeedWords(mnemonic: string, passphrase?: string, accountIndex?: number): {
    privateKey: Uint8Array;
    publicKey: string;
};
export declare function extendedKeysFromSeedWords(mnemonic: string, passphrase?: string, extendedAccountIndex?: number): {
    privateExtendedKey: string;
    publicExtendedKey: string;
};
export declare function accountFromExtendedKey(base58key: string, accountIndex?: number): {
    privateKey?: Uint8Array;
    publicKey: string;
};
export declare function generateSeedWords(): string;
export declare function validateWords(words: string): boolean;
