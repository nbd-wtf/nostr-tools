import { hexToBytes } from "@noble/hashes/utils"
import { decrypt, encrypt, getConversationKey } from "./nip44.ts"
import { finalizeEvent, getPublicKey } from "./pure.ts"
import { AbstractSimplePool } from "./abstract-pool.ts"
export type NofferData = { offer: string, amount?: number }
export type Nip69Success = { bolt11: string }
export type Nip69Error = { code: number, error: string, range: { min: number, max: number } }
export type Nip69Response = Nip69Success | Nip69Error

export const SendNofferRequest = async (pool: AbstractSimplePool, privateKey: Uint8Array, relays: string[], pubKey: string, data: NofferData): Promise<Nip69Response> => {
    const publicKey = getPublicKey(privateKey)
    const content = encrypt(JSON.stringify(data), getConversationKey(privateKey, pubKey))
    const event = newNip69Event(content, publicKey, pubKey)
    const signed = finalizeEvent(event, privateKey)
    pool.publish(relays, signed)
    const res = await pool.get(relays, newNip69Filter(pubKey, signed.id), { maxWait: 30 * 1000 })
    if (!res) {
        throw new Error("failed to get nip69 response in time")
    }
    decrypt(res.content, getConversationKey(privateKey, pubKey))
    return JSON.parse(res.content) as Nip69Response
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