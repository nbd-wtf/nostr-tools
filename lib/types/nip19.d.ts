export type NProfile = `nprofile1${string}`;
export type NRelay = `nrelay1${string}`;
export type NEvent = `nevent1${string}`;
export type NAddr = `naddr1${string}`;
export type NSec = `nsec1${string}`;
export type NPub = `npub1${string}`;
export type Note = `note1${string}`;
export type Ncryptsec = `ncryptsec1${string}`;
export type Noffer = `noffer1${string}`;
export type Ndebit = `ndebit1${string}`;
export declare const NostrTypeGuard: {
    isNProfile: (value?: string | null) => value is `nprofile1${string}`;
    isNRelay: (value?: string | null) => value is `nrelay1${string}`;
    isNEvent: (value?: string | null) => value is `nevent1${string}`;
    isNAddr: (value?: string | null) => value is `naddr1${string}`;
    isNSec: (value?: string | null) => value is `nsec1${string}`;
    isNPub: (value?: string | null) => value is `npub1${string}`;
    isNote: (value?: string | null) => value is `note1${string}`;
    isNcryptsec: (value?: string | null) => value is `ncryptsec1${string}`;
    isNoffer: (value?: string | null) => value is `noffer1${string}`;
    isNdebit: (value?: string | null) => value is `ndebit1${string}`;
};
export declare const Bech32MaxSize = 5000;
/**
 * Bech32 regex.
 * @see https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki#bech32
 */
export declare const BECH32_REGEX: RegExp;
export type ProfilePointer = {
    pubkey: string;
    relays?: string[];
};
export type EventPointer = {
    id: string;
    relays?: string[];
    author?: string;
    kind?: number;
};
export type AddressPointer = {
    identifier: string;
    pubkey: string;
    kind: number;
    relays?: string[];
};
export type OfferPointer = {
    pubkey: string;
    relay: string;
    offer: string;
    priceType: OfferPriceType;
    price?: number;
};
export declare enum OfferPriceType {
    Fixed = 0,
    Variable = 1,
    Spontaneous = 2
}
export type DebitPointer = {
    pubkey: string;
    relay: string;
    pointer?: string;
};
type Prefixes = {
    nprofile: ProfilePointer;
    nevent: EventPointer;
    naddr: AddressPointer;
    nsec: Uint8Array;
    npub: string;
    note: string;
    noffer: OfferPointer;
    ndebit: DebitPointer;
};
type DecodeValue<Prefix extends keyof Prefixes> = {
    type: Prefix;
    data: Prefixes[Prefix];
};
export type DecodeResult = {
    [P in keyof Prefixes]: DecodeValue<P>;
}[keyof Prefixes];
export declare function decode<Prefix extends keyof Prefixes>(nip19: `${Prefix}1${string}`): DecodeValue<Prefix>;
export declare function decode(nip19: string): DecodeResult;
export declare function nsecEncode(key: Uint8Array): NSec;
export declare function npubEncode(hex: string): NPub;
export declare function noteEncode(hex: string): Note;
export declare function encodeBytes<Prefix extends string>(prefix: Prefix, bytes: Uint8Array): `${Prefix}1${string}`;
export declare function nprofileEncode(profile: ProfilePointer): NProfile;
export declare function neventEncode(event: EventPointer): NEvent;
export declare function naddrEncode(addr: AddressPointer): NAddr;
export declare const nofferEncode: (offer: OfferPointer) => string;
export declare const ndebitEncode: (debit: DebitPointer) => string;
export {};
