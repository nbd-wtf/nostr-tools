export declare function privateKeyFromSeedWords(mnemonic: string, passphrase?: string, accountIndex?: number): string;
export declare function accountFromSeedWords(mnemonic: string, passphrase?: string, accountIndex?: number): {
    privateKey: string;
    publicKey: string;
};
export declare function extendedKeysFromSeedWords(mnemonic: string, passphrase?: string, extendedAccountIndex?: number): {
    privateExtendedKey: string;
    publicExtendedKey: string;
};
export declare function accountFromExtendedKey(base58key: string, accountIndex?: number): {
    privateKey?: string;
    publicKey: string;
};
export declare function generateSeedWords(): string;
export declare function validateWords(words: string): boolean;
