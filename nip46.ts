import { EventTemplate, NostrEvent, VerifiedEvent } from './core.ts'
import { generateSecretKey, finalizeEvent, getPublicKey, verifyEvent } from './pure.ts'
import { AbstractSimplePool, SubCloser } from './abstract-pool.ts'
import { getConversationKey, decrypt, encrypt } from './nip44.ts'
import { NIP05_REGEX } from './nip05.ts'
import { SimplePool } from './pool.ts'
import { Handlerinformation, NostrConnect } from './kinds.ts'
import type { RelayRecord } from './relay.ts'

var _fetch: any

try {
  _fetch = fetch
} catch {}

export function useFetchImplementation(fetchImplementation: any) {
  _fetch = fetchImplementation
}

export const BUNKER_REGEX = /^bunker:\/\/([0-9a-f]{64})\??([?\/\w:.=&%-]*)$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type BunkerPointer = {
  relays: string[]
  pubkey: string
  secret: null | string
}

export function toBunkerURL(bunkerPointer: BunkerPointer): string {
  let bunkerURL = new URL(`bunker://${bunkerPointer.pubkey}`)
  bunkerPointer.relays.forEach(relay => {
    bunkerURL.searchParams.append('relay', relay)
  })
  if (bunkerPointer.secret) {
    bunkerURL.searchParams.set('secret', bunkerPointer.secret)
  }
  return bunkerURL.toString()
}

/** This takes either a bunker:// URL or a name@domain.com NIP-05 identifier
    and returns a BunkerPointer -- or null in case of error */
export async function parseBunkerInput(input: string): Promise<BunkerPointer | null> {
  let match = input.match(BUNKER_REGEX)
  if (match) {
    try {
      const pubkey = match[1]
      const qs = new URLSearchParams(match[2])
      return {
        pubkey,
        relays: qs.getAll('relay'),
        secret: qs.get('secret'),
      }
    } catch (_err) {
      /* just move to the next case */
    }
  }

  return queryBunkerProfile(input)
}

export async function queryBunkerProfile(nip05: string): Promise<BunkerPointer | null> {
  const match = nip05.match(NIP05_REGEX)
  if (!match) return null

  const [_, name = '_', domain] = match

  try {
    const url = `https://${domain}/.well-known/nostr.json?name=${name}`
    const res = await (await _fetch(url, { redirect: 'error' })).json()

    let pubkey = res.names[name]
    let relays = res.nip46[pubkey] || []

    return { pubkey, relays, secret: null }
  } catch (_err) {
    return null
  }
}

export type BunkerSignerParams = {
  pool?: AbstractSimplePool
  onauth?: (url: string) => void
}

export class BunkerSigner {
  private pool: AbstractSimplePool
  private subCloser: SubCloser | undefined
  private isOpen: boolean
  private serial: number
  private idPrefix: string
  private listeners: {
    [id: string]: {
      resolve: (_: string) => void
      reject: (_: string) => void
    }
  }
  private waitingForAuth: { [id: string]: boolean }
  private secretKey: Uint8Array
  private conversationKey: Uint8Array
  public bp: BunkerPointer

  private cachedPubKey: string | undefined

  /**
   * Creates a new instance of the Nip46 class.
   * @param relays - An array of relay addresses.
   * @param remotePubkey - An optional remote public key. This is the key you want to sign as.
   * @param secretKey - An optional key pair.
   */
  public constructor(clientSecretKey: Uint8Array, bp: BunkerPointer, params: BunkerSignerParams = {}) {
    if (bp.relays.length === 0) {
      throw new Error('no relays are specified for this bunker')
    }

    this.pool = params.pool || new SimplePool()
    this.secretKey = clientSecretKey
    this.conversationKey = getConversationKey(clientSecretKey, bp.pubkey)
    this.bp = bp
    this.isOpen = false
    this.idPrefix = Math.random().toString(36).substring(7)
    this.serial = 0
    this.listeners = {}
    this.waitingForAuth = {}

    this.setupSubscription(params)
  }

  private setupSubscription(params: BunkerSignerParams) {
    const listeners = this.listeners
    const waitingForAuth = this.waitingForAuth
    const convKey = this.conversationKey

    this.subCloser = this.pool.subscribe(
      this.bp.relays,
      { kinds: [NostrConnect], authors: [this.bp.pubkey], '#p': [getPublicKey(this.secretKey)] },
      {
        onevent: async (event: NostrEvent) => {
          const o = JSON.parse(decrypt(event.content, convKey))
          const { id, result, error } = o

          if (result === 'auth_url' && waitingForAuth[id]) {
            delete waitingForAuth[id]

            if (params.onauth) {
              params.onauth(error)
            } else {
              console.warn(
                `nostr-tools/nip46: remote signer ${this.bp.pubkey} tried to send an "auth_url"='${error}' but there was no onauth() callback configured.`,
              )
            }
            return
          }

          let handler = listeners[id]
          if (handler) {
            if (error) handler.reject(error)
            else if (result) handler.resolve(result)
            delete listeners[id]
          }
        },
        onclose: () => {
          if (this.isOpen) {
            // If we get onclose but isOpen is still true, that means the client still wants to stay connected
            this.subCloser!.close()
            this.setupSubscription(params)
          }
        },
      },
    )
    this.isOpen = true
  }

  // closes the subscription -- this object can't be used anymore after this
  async close() {
    this.isOpen = false
    this.subCloser!.close()
  }

  async sendRequest(method: string, params: string[]): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.isOpen) throw new Error('this signer is not open anymore, create a new one')
        this.serial++
        const id = `${this.idPrefix}-${this.serial}`

        const encryptedContent = encrypt(JSON.stringify({ id, method, params }), this.conversationKey)

        // the request event
        const verifiedEvent: VerifiedEvent = finalizeEvent(
          {
            kind: NostrConnect,
            tags: [['p', this.bp.pubkey]],
            content: encryptedContent,
            created_at: Math.floor(Date.now() / 1000),
          },
          this.secretKey,
        )

        // setup callback listener
        this.listeners[id] = { resolve, reject }
        this.waitingForAuth[id] = true

        // publish the event
        await Promise.any(this.pool.publish(this.bp.relays, verifiedEvent))
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Calls the "connect" method on the bunker.
   * The promise will be rejected if the response is not "pong".
   */
  async ping(): Promise<void> {
    let resp = await this.sendRequest('ping', [])
    if (resp !== 'pong') throw new Error(`result is not pong: ${resp}`)
  }

  /**
   * Calls the "connect" method on the bunker.
   */
  async connect(): Promise<void> {
    await this.sendRequest('connect', [this.bp.pubkey, this.bp.secret || ''])
  }

  /**
   * Calls the "get_public_key" method on the bunker.
   * (before we would return the public key hardcoded in the bunker parameters, but
   *  that is not correct as that may be the bunker pubkey and the actual signer
   *  pubkey may be different.)
   */
  async getPublicKey(): Promise<string> {
    if (!this.cachedPubKey) {
      this.cachedPubKey = await this.sendRequest('get_public_key', [])
    }
    return this.cachedPubKey
  }

  /**
   * @deprecated removed from NIP
   */
  async getRelays(): Promise<RelayRecord> {
    return JSON.parse(await this.sendRequest('get_relays', []))
  }

  /**
   * Signs an event using the remote private key.
   * @param event - The event to sign.
   * @returns A Promise that resolves to the signed event.
   */
  async signEvent(event: EventTemplate): Promise<VerifiedEvent> {
    let resp = await this.sendRequest('sign_event', [JSON.stringify(event)])
    let signed: NostrEvent = JSON.parse(resp)
    if (verifyEvent(signed)) {
      return signed
    } else {
      throw new Error(`event returned from bunker is improperly signed: ${JSON.stringify(signed)}`)
    }
  }

  async nip04Encrypt(thirdPartyPubkey: string, plaintext: string): Promise<string> {
    return await this.sendRequest('nip04_encrypt', [thirdPartyPubkey, plaintext])
  }

  async nip04Decrypt(thirdPartyPubkey: string, ciphertext: string): Promise<string> {
    return await this.sendRequest('nip04_decrypt', [thirdPartyPubkey, ciphertext])
  }

  async nip44Encrypt(thirdPartyPubkey: string, plaintext: string): Promise<string> {
    return await this.sendRequest('nip44_encrypt', [thirdPartyPubkey, plaintext])
  }

  async nip44Decrypt(thirdPartyPubkey: string, ciphertext: string): Promise<string> {
    return await this.sendRequest('nip44_decrypt', [thirdPartyPubkey, ciphertext])
  }
}

/**
 * Creates an account with the specified username, domain, and optional email.
 * @param bunkerPubkey - The public key of the bunker to use for the create_account call.
 * @param username - The username for the account.
 * @param domain - The domain for the account.
 * @param email - The optional email for the account.
 * @param localSecretKey - Optionally pass a local secret key that will be used to communicate with the bunker,
                           this will default to generating a random key.
 * @throws Error if the email is present but invalid.
 * @returns A Promise that resolves to the auth_url that the client should follow to create an account.
 */
export async function createAccount(
  bunker: BunkerProfile,
  params: BunkerSignerParams,
  username: string,
  domain: string,
  email?: string,
  localSecretKey: Uint8Array = generateSecretKey(),
): Promise<BunkerSigner> {
  if (email && !EMAIL_REGEX.test(email)) throw new Error('Invalid email')

  let rpc = new BunkerSigner(localSecretKey, bunker.bunkerPointer, params)

  let pubkey = await rpc.sendRequest('create_account', [username, domain, email || ''])

  // once we get the newly created pubkey back, we hijack this signer instance
  // and turn it into the main instance for this newly created pubkey
  rpc.bp.pubkey = pubkey
  await rpc.connect()

  return rpc
}

/**
 * Fetches info on available providers that announce themselves using NIP-89 events.
 * @returns A promise that resolves to an array of available bunker objects.
 */
export async function fetchBunkerProviders(pool: AbstractSimplePool, relays: string[]): Promise<BunkerProfile[]> {
  const events = await pool.querySync(relays, {
    kinds: [Handlerinformation],
    '#k': [NostrConnect.toString()],
  })

  events.sort((a, b) => b.created_at - a.created_at)

  // validate bunkers by checking their NIP-05 and pubkey
  // map to a more useful object
  const validatedBunkers = await Promise.all(
    events.map(async (event, i) => {
      try {
        const content = JSON.parse(event.content)

        // skip duplicates
        try {
          if (events.findIndex(ev => JSON.parse(ev.content).nip05 === content.nip05) !== i) return undefined
        } catch (err) {
          /***/
        }

        const bp = await queryBunkerProfile(content.nip05)
        if (bp && bp.pubkey === event.pubkey && bp.relays.length) {
          return {
            bunkerPointer: bp,
            nip05: content.nip05,
            domain: content.nip05.split('@')[1],
            name: content.name || content.display_name,
            picture: content.picture,
            about: content.about,
            website: content.website,
            local: false,
          }
        }
      } catch (err) {
        return undefined
      }
    }),
  )

  return validatedBunkers.filter(b => b !== undefined) as BunkerProfile[]
}

export type BunkerProfile = {
  bunkerPointer: BunkerPointer
  domain: string
  nip05: string
  name: string
  picture: string
  about: string
  website: string
  local: boolean
}
