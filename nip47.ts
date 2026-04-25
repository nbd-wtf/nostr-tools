import { type VerifiedEvent, finalizeEvent } from './pure.ts'
import { NWCWalletRequest } from './kinds.ts'
import { encrypt } from './nip04.ts'

interface NWCConnection {
  pubkey: string
  /** @deprecated Use `relays` instead. This returns only the first relay. */
  relay: string
  relays: string[]
  secret: string
}

export function parseConnectionString(connectionString: string): NWCConnection {
  const { host, pathname, searchParams } = new URL(connectionString)
  const pubkey = pathname || host
  const relays = searchParams.getAll('relay')
  const secret = searchParams.get('secret')

  if (!pubkey || relays.length === 0 || !secret) {
    throw new Error('invalid connection string')
  }

  return { pubkey, relay: relays[0], relays, secret }
}

export async function makeNwcRequestEvent(
  pubkey: string,
  secretKey: Uint8Array,
  invoice: string,
): Promise<VerifiedEvent> {
  const content = {
    method: 'pay_invoice',
    params: {
      invoice,
    },
  }
  const encryptedContent = encrypt(secretKey, pubkey, JSON.stringify(content))
  const eventTemplate = {
    kind: NWCWalletRequest,
    created_at: Math.round(Date.now() / 1000),
    content: encryptedContent,
    tags: [['p', pubkey]],
  }

  return finalizeEvent(eventTemplate, secretKey)
}
