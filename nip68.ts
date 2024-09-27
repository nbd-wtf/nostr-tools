import { hexToBytes } from "@noble/hashes/utils"
import { decrypt, encrypt, getConversationKey } from "./nip44.ts"
import { finalizeEvent, getPublicKey } from "./pure.ts"
import { AbstractSimplePool } from "./abstract-pool.ts"
export type RecurringDebitTimeUnit = 'day' | 'week' | 'month'
export type RecurringDebit = { frequency: { number: number, unit: RecurringDebitTimeUnit }, amount_sats: number }
export type SingleDebit = { pointer?: string, amount_sats?: number, bolt11: string, frequency?: undefined }
export type NdebitData = RecurringDebit | SingleDebit
export type NdebitSuccess = { res: 'ok' }
export type NdebitSuccessPayment = { res: 'ok', preimage: string }
export type NdebitFailure = { res: 'GFY', error: string, code: number }
export type Nip68Response = NdebitSuccess | NdebitSuccessPayment | NdebitFailure

export const SendNdebitRequest = async (pool: AbstractSimplePool, privateKey: Uint8Array, relays: string[], pubKey: string, data: NdebitData): Promise<Nip68Response> => {
    const publicKey = getPublicKey(privateKey)
    const content = encrypt(JSON.stringify(data), getConversationKey(privateKey, pubKey))
    const event = newNip68Event(content, publicKey, pubKey)
    const signed = finalizeEvent(event, privateKey)
    pool.publish(relays, signed)
    const res = await pool.get(relays, newNip68Filter(pubKey, signed.id), { maxWait: 30 * 1000 })
    if (!res) {
        throw new Error("failed to get nip68 response in time")
    }
    decrypt(res.content, getConversationKey(privateKey, pubKey))
    return JSON.parse(res.content) as Nip68Response
}

export const newNip68Event = (content: string, fromPub: string, toPub: string) => ({
    content,
    created_at: Math.floor(Date.now() / 1000),
    kind: 21002,
    pubkey: fromPub,
    tags: [['p', toPub]]
})

export const newNip68Filter = (publicKey: string, eventId: string) => ({
    since: Math.floor(Date.now() / 1000) - 1,
    kinds: [21002],
    '#p': [publicKey],
    '#e': [eventId]
})