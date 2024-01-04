import { finalizeEvent } from './pure.ts'
import { NWCWalletRequest } from './kinds.ts'
import { encrypt } from './nip04.ts'

export function parseConnectionString(connectionString: string) {
  const { pathname, host, searchParams } = new URL(connectionString)
  const pubkey = connectionString.indexOf('//') === -1 ? pathname : host
  const relay = searchParams.get('relay')
  const secret = searchParams.get('secret')

  if (!pubkey || !relay || !secret) {
    throw new Error('invalid connection string')
  }

  return { pubkey, relay, secret }
}

export async function makeNwcRequestEvent(pubkey: string, secretKey: Uint8Array, invoice: string) {
  const content = {
    method: 'pay_invoice',
    params: {
      invoice,
    },
  }
  const encryptedContent = await encrypt(secretKey, pubkey, JSON.stringify(content))
  const eventTemplate = {
    kind: NWCWalletRequest,
    created_at: Math.round(Date.now() / 1000),
    content: encryptedContent,
    tags: [['p', pubkey]],
  }

  return finalizeEvent(eventTemplate, secretKey)
}
