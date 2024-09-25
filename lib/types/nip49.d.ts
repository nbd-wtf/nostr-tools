import { Ncryptsec } from './nip19.ts';
export declare function encrypt(sec: Uint8Array, password: string, logn?: number, ksb?: 0x00 | 0x01 | 0x02): Ncryptsec;
export declare function decrypt(ncryptsec: string, password: string): Uint8Array;
