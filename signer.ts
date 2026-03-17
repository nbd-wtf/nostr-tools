import { EventTemplate, VerifiedEvent } from './core.ts'
import { finalizeEvent, getPublicKey } from './pure.ts'

export interface Signer {
  getPublicKey(): Promise<string>
  signEvent(event: EventTemplate): Promise<VerifiedEvent>
}

export class PlainKeySigner implements Signer {
  private secretKey: Uint8Array

  constructor(secretKey: Uint8Array) {
    this.secretKey = secretKey
  }

  async getPublicKey(): Promise<string> {
    return getPublicKey(this.secretKey)
  }

  async signEvent(event: EventTemplate): Promise<VerifiedEvent> {
    return finalizeEvent(event, this.secretKey)
  }
}
