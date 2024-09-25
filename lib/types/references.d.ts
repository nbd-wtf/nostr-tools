import { type AddressPointer, type ProfilePointer, type EventPointer } from './nip19.ts';
import type { Event } from './core.ts';
type Reference = {
    text: string;
    profile?: ProfilePointer;
    event?: EventPointer;
    address?: AddressPointer;
};
export declare function parseReferences(evt: Event): Reference[];
export {};
