import { NostrEvent, UnsignedEvent, VerifiedEvent } from './core.ts'
import { generateSecretKey, finalizeEvent, getPublicKey, verifyEvent } from './pure.ts'
import { AbstractSimplePool, SubCloser } from './abstract-pool.ts'
import { decrypt, encrypt } from './nip04.ts'
import { NIP05_REGEX } from './nip05.ts'
import { SimplePool } from './pool.ts'
import { Handlerinformation, NostrConnect, NostrConnectAdmin } from './kinds.ts'

var _fetch: any

try {
  _fetch = fetch
} catch {}

export function useFetchImplementation(fetchImplementation: any) {
  _fetch = fetchImplementation
}

export const BUNKER_REGEX = /^bunker:\/\/([0-9a-f]{64})\??([?\/\w:.=&%]*)$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type BunkerPointer = {
  relays: string[]
  pubkey: string
  secret: null | string
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

async function queryBunkerProfile(nip05: string): Promise<BunkerPointer | null> {
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
  private subCloser: SubCloser
  private relays: string[]
  private isOpen: boolean
  private serial: number
  private idPrefix: string
  private listeners: {
    [id: string]: {
      resolve: (_: string) => void
      reject: (_: string) => void
    }
  }
  private secretKey: Uint8Array
  private connectionSecret: string
  public remotePubkey: string

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
    this.relays = bp.relays
    this.remotePubkey = bp.pubkey
    this.connectionSecret = bp.secret || ''
    this.isOpen = false
    this.idPrefix = Math.random().toString(36).substring(7)
    this.serial = 0
    this.listeners = {}

    const listeners = this.listeners

    this.subCloser = this.pool.subscribeMany(
      this.relays,
      [{ kinds: [NostrConnect, NostrConnectAdmin], '#p': [getPublicKey(this.secretKey)] }],
      {
        async onevent(event: NostrEvent) {
          const { id, result, error } = JSON.parse(await decrypt(clientSecretKey, event.pubkey, event.content))

          if (result === 'auth_url') {
            if (params.onauth) {
              params.onauth(error)
            } else {
              console.warn(
                `nostr-tools/nip46: remote signer ${bp.pubkey} tried to send an "auth_url"='${error}' but there was no onauth() callback configured.`,
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
      },
    )
    this.isOpen = true
  }

  // closes the subscription -- this object can't be used anymore after this
  async close() {
    this.isOpen = false
    this.subCloser.close()
  }

  async sendRequest(method: string, params: string[]): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.isOpen) throw new Error('this signer is not open anymore, create a new one')
        this.serial++
        const id = `${this.idPrefix}-${this.serial}`

        const encryptedContent = await encrypt(
          this.secretKey,
          this.remotePubkey,
          JSON.stringify({ id, method, params }),
        )

        // the request event
        const verifiedEvent: VerifiedEvent = finalizeEvent(
          {
            kind: method === 'create_account' ? NostrConnectAdmin : NostrConnect,
            tags: [['p', this.remotePubkey]],
            content: encryptedContent,
            created_at: Math.floor(Date.now() / 1000),
          },
          this.secretKey,
        )

        // setup callback listener
        this.listeners[id] = { resolve, reject }

        // publish the event
        await Promise.any(this.pool.publish(this.relays, verifiedEvent))
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Sends a ping request to the remote server.
   * Requires permission/access rights to bunker.
   * @returns "Pong" if successful. The promise will reject if the response is not "pong".
   */
  async ping(): Promise<void> {
    let resp = await this.sendRequest('ping', [])
    if (resp !== 'pong') throw new Error(`result is not pong: ${resp}`)
  }

  /**
   * Connects to a remote server using the provided keys and remote public key.
   * Optionally, a secret can be provided for additional authentication.
   *
   * @param remotePubkey - Optional the remote public key to connect to.
   * @param secret - Optional secret for additional authentication.
   * @returns "ack" if successful. The promise will reject if the response is not "ack".
   */
  async connect(): Promise<void> {
    await this.sendRequest('connect', [getPublicKey(this.secretKey), this.connectionSecret])
  }

  /**
   * Signs an event using the remote private key.
   * @param event - The event to sign.
   * @returns A Promise that resolves to the signed event.
   */
  async signEvent(event: UnsignedEvent): Promise<VerifiedEvent> {
    let resp = await this.sendRequest('sign_event', [JSON.stringify(event)])
    let signed: NostrEvent = JSON.parse(resp)
    if (signed.pubkey === this.remotePubkey && verifyEvent(signed)) {
      return signed
    } else {
      throw new Error(`event returned from bunker is improperly signed: ${JSON.stringify(signed)}`)
    }
  }
}

/**
 * Creates an account with the specified username, domain, and optional email.
 * @param bunkerPubkey - The public key of the bunker to use for the create_account call.
 * @param username - The username for the account.
 * @param domain - The domain for the account.
 * @param email - The optional email for the account.
 * @throws Error if the email is present but invalid.
 * @returns A Promise that resolves to the auth_url that the client should follow to create an account.
 */
export async function createAccount(
  bunker: BunkerProfile,
  params: BunkerSignerParams,
  username: string,
  domain: string,
  email?: string,
): Promise<BunkerSigner> {
  if (email && !EMAIL_REGEX.test(email)) throw new Error('Invalid email')

  let sk = generateSecretKey()
  let rpc = new BunkerSigner(sk, bunker.bunkerPointer, params)

  let pubkey = await rpc.sendRequest('create_account', [username, domain, email || ''])

  // once we get the newly created pubkey back, we hijack this signer instance
  // and turn it into the main instance for this newly created pubkey
  rpc.remotePubkey = pubkey
  await rpc.connect()

  return rpc
}

/**
 * Fetches info on available providers that announce themselves using NIP-89 events.
 * @returns A promise that resolves to an array of available bunker objects.
 */
export async function fetchCustodialbunkers(pool: AbstractSimplePool, relays: string[]): Promise<BunkerProfile[]> {
  const events = await pool.querySync(relays, {
    kinds: [Handlerinformation],
    '#k': [NostrConnect.toString()],
  })

  // validate bunkers by checking their NIP-05 and pubkey
  // map to a more useful object
  const validatedBunkers = await Promise.all(
    events.map(async event => {
      try {
        const content = JSON.parse(event.content)
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
