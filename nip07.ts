import { EventTemplate, NostrEvent } from './core.ts'
import { RelayMap } from './index.ts'

export interface Nip07 {
  getPublicKey(): Promise<string>
  signEvent(event: EventTemplate): Promise<NostrEvent>
  getRelays(): Promise<RelayMap>
  nip04: {
    encrypt(pubkey: string, plaintext: string): Promise<string>
    ecrypt(pubkey: string, ciphertext: string): Promise<string>
  }
  nip44: {
    encrypt(pubkey: string, plaintext: string): Promise<string>
    decrypt(pubkey: string, ciphertext: string): Promise<string>
  }
}
