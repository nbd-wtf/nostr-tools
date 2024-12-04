import { decrypt, encrypt, getConversationKey } from "./nip44.ts"
import { finalizeEvent, getPublicKey } from "./pure.ts"
import { AbstractSimplePool, SubCloser } from "./abstract-pool.ts"
export type NofferData = { offer: string, amount?: number, zap?: string, payer_data?: any }
export type Nip69Success = { bolt11: string }
export type Nip69Error = { code: number, error: string, range: { min: number, max: number } }
export type Nip69Response = Nip69Success | Nip69Error

export const SendNofferRequest = async (pool: AbstractSimplePool, privateKey: Uint8Array, relays: string[], toPubKey: string, data: NofferData, timeoutSeconds = 30): Promise<Nip69Response> => {
    const publicKey = getPublicKey(privateKey)
    const content = encrypt(JSON.stringify(data), getConversationKey(privateKey, toPubKey))
    const event = newNip69Event(content, publicKey, toPubKey)
    const signed = finalizeEvent(event, privateKey)
    await Promise.all(pool.publish(relays, signed))
    return new Promise<Nip69Response>((res, rej) => {
        let closer: SubCloser = { close: () => { } }
        const timeout = setTimeout(() => {
            closer.close(); rej("failed to get nip69 response in time")
        }, timeoutSeconds * 1000)

        closer = pool.subscribeMany(relays, [newNip69Filter(publicKey, signed.id)], {
            onevent: async (e) => {
                clearTimeout(timeout)
                const content = decrypt(e.content, getConversationKey(privateKey, toPubKey))
                res(JSON.parse(content))
            }
        })
    })
}

export const newNip69Event = (content: string, fromPub: string, toPub: string) => ({
    content,
    created_at: Math.floor(Date.now() / 1000),
    kind: 21001,
    pubkey: fromPub,
    tags: [['p', toPub]]
})

export const newNip69Filter = (publicKey: string, eventId: string) => ({
    since: Math.floor(Date.now() / 1000) - 1,
    kinds: [21001],
    '#p': [publicKey],
    '#e': [eventId]
})