export declare function getHex64(json: string, field: string): string;
export declare function getInt(json: string, field: string): number;
export declare function getSubscriptionId(json: string): string | null;
export declare function matchEventId(json: string, id: string): boolean;
export declare function matchEventPubkey(json: string, pubkey: string): boolean;
export declare function matchEventKind(json: string, kind: number): boolean;
