import { decrypt, encrypt, getConversationKey } from './nip44.ts'
import { finalizeEvent, getPublicKey } from './pure.ts'
import { AbstractSimplePool, SubCloser } from './abstract-pool.ts'
export type RecurringDebitTimeUnit = 'day' | 'week' | 'month'
export type BudgetFrequency = { number: number, unit: RecurringDebitTimeUnit }
export type NdebitData = { pointer?: string, amount_sats?: number, bolt11?: string, frequency?: BudgetFrequency }

export type NdebitSuccess = { res: 'ok' }
export type NdebitSuccessPayment = { res: 'ok', preimage: string }
export type NdebitFailure = { res: 'GFY', error: string, code: number }
export type Nip68Response = NdebitSuccess | NdebitSuccessPayment | NdebitFailure

export const SendNdebitRequest = async (pool: AbstractSimplePool, privateKey: Uint8Array, relays: string[], pubKey: string, data: NdebitData, timeoutSeconds?: number): Promise<Nip68Response> => {
    const publicKey = getPublicKey(privateKey)
    const content = encrypt(JSON.stringify(data), getConversationKey(privateKey, pubKey))
    const event = newNip68Event(content, publicKey, pubKey)
    const signed = finalizeEvent(event, privateKey)
    await Promise.all(pool.publish(relays, signed))
    return new Promise<Nip68Response>((res, rej) => {
        let closer: SubCloser = { close: () => { } }
        let timer: Timer | null = null
        if (timeoutSeconds) {
            timer = setTimeout(() => {
                closer.close(); rej('failed to get nip69 response in time')
            }, timeoutSeconds * 1000)
        }
        closer = pool.subscribeMany(relays, [newNip68Filter(publicKey, signed.id)], {
            onevent: async (e) => {
                if (timer) clearTimeout(timer)
                const content = decrypt(e.content, getConversationKey(privateKey, pubKey))
                res(JSON.parse(content))
            }
        })
    })
}

export const newFullAccessRequest = (): NdebitData => {
    return {}
}
export const newPaymentRequest = (invoice: string, amount?: number): NdebitData => {
    return {
        bolt11: invoice,
        amount_sats: amount
    }
}
export const newBudgetRequest = (frequency: BudgetFrequency, amount: number): NdebitData => {
    return {
        amount_sats: amount,
        frequency: frequency
    }
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
