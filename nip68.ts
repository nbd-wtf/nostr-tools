import { decrypt, encrypt, getConversationKey } from './nip44.ts'
import { finalizeEvent, getPublicKey } from './pure.ts'
import { AbstractSimplePool, SubCloser } from './abstract-pool.ts'
export type RecurringDebitTimeUnit = 'day' | 'week' | 'month'
export type RecurringDebit = { pointer?: string, frequency: { number: number, unit: RecurringDebitTimeUnit }, amount_sats: number }
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
    await Promise.all(pool.publish(relays, signed))
    return new Promise<Nip68Response>((res, rej) => {
        let closer: SubCloser = { close: () => { } }
        const timeout = setTimeout(() => {
            closer.close(); rej('failed to get nip69 response in time')
        }, 30 * 1000)

        closer = pool.subscribeMany(relays, [newNip68Filter(publicKey, signed.id)], {
            onevent: async (e) => {
                clearTimeout(timeout)
                const content = decrypt(e.content, getConversationKey(privateKey, pubKey))
                res(JSON.parse(content))
            }
        })
    })
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
