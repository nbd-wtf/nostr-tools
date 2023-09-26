import { finishEvent } from './event.ts'
import { encrypt } from './nip04.ts'
import { Kind } from './event'

export function parseConnectionString(connectionString: string) {
  const { pathname, searchParams } = new URL(connectionString)
  const pubkey = pathname
  const relay = searchParams.get('relay')
  const secret = searchParams.get('secret')

  if (!pubkey || !relay || !secret) {
    throw new Error('invalid connection string')
  }

  return { pubkey, relay, secret }
}

export async function makeNwcRequestEvent({
  pubkey,
  secret,
  invoice,
}: {
  pubkey: string
  secret: string
  invoice: string
}) {
  const content = {
    method: 'pay_invoice',
    params: {
      invoice,
    },
  }
  const encryptedContent = await encrypt(secret, pubkey, JSON.stringify(content))
  const eventTemplate = {
    kind: Kind.NwcRequest,
    created_at: Math.round(Date.now() / 1000),
    content: encryptedContent,
    tags: [['p', pubkey]],
  }

  return finishEvent(eventTemplate, secret)
}
