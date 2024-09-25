import { hexToBytes } from "@noble/hashes/utils"
import { decrypt, encrypt, getConversationKey } from "./nip44.ts"
import { finalizeEvent, getPublicKey } from "./pure.ts"
import { AbstractSimplePool } from "./abstract-pool.ts"
type RecurringDebitTimeUnit = 'day' | 'week' | 'month'
type RecurringDebit = { frequency: { number: number, unit: RecurringDebitTimeUnit }, amount_sats: number }
export type NdebitData = { pointer?: string, amount_sats: number } & (RecurringDebit | { bolt11: string })
export type NdebitSuccess = { res: 'ok' }
export type NdebitSuccessPayment = { res: 'ok', preimage: string }
export type NdebitFailure = { res: 'GFY', error: string, code: number }
export type Nip68Response = NdebitSuccess | NdebitSuccessPayment | NdebitFailure

export const SendNdebitRequest = async (pool: AbstractSimplePool, privateKey: string, relays: string[], pubKey: string, data: NdebitData): Promise<Nip68Response> => {
    const privateBytes = hexToBytes(privateKey)
    const publicKey = getPublicKey(privateBytes)
    const content = encrypt(JSON.stringify(data), getConversationKey(privateBytes, pubKey))
    const event = newNip68Event(content, publicKey, pubKey)
    const signed = finalizeEvent(event, privateBytes)
    pool.publish(relays, signed)
    const res = await pool.get(relays, newNip68Filter(pubKey, signed.id), { maxWait: 30 * 1000 })
    if (!res) {
        throw new Error("failed to get nip68 response in time")
    }
    decrypt(res.content, getConversationKey(privateBytes, pubKey))
    return JSON.parse(res.content) as Nip68Response
}

const newNip68Event = (content: string, fromPub: string, toPub: string) => ({
    content,
    created_at: Math.floor(Date.now() / 1000),
    kind: 21002,
    pubkey: fromPub,
    tags: [['p', toPub]]
})

const newNip68Filter = (publicKey: string, eventId: string) => ({
    since: Math.floor(Date.now() / 1000) - 1,
    kinds: [21002],
    '#p': [publicKey],
    '#e': [eventId]
})