import { EventTemplate, VerifiedEvent } from './core.ts'

export interface Signer {
  getPublicKey(): Promise<string>
  signEvent(event: EventTemplate): Promise<VerifiedEvent>
}
