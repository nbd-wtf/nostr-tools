import { EventTemplate, NostrEvent, VerifiedEvent } from './core.ts'
import { generateSecretKey, finalizeEvent, getPublicKey, verifyEvent } from './pure.ts'
import { AbstractSimplePool, SubCloser } from './abstract-pool.ts'
import { getConversationKey, decrypt, encrypt } from './nip44.ts'
import { NIP05_REGEX } from './nip05.ts'
import { SimplePool } from './pool.ts'
import { Handlerinformation, NostrConnect } from './kinds.ts'
import { Signer } from './signer.ts'

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

export type ClientMetadata = {
  name?: string
  url?: string
  image?: string
}

export type NostrConnectParams = {
  clientPubkey: string
  relays: string[]
  secret: string
  perms?: string[]
} & ClientMetadata

export function createNostrConnectURI(params: NostrConnectParams): string {
  const queryParams = new URLSearchParams()

  params.relays.forEach(relay => {
    queryParams.append('relay', relay)
  })

  queryParams.append('secret', params.secret)

  if (params.perms && params.perms.length > 0) {
    queryParams.append('perms', params.perms.join(','))
  }
  if (params.name) {
    queryParams.append('name', params.name)
  }
  if (params.url) {
    queryParams.append('url', params.url)
  }
  if (params.image) {
    queryParams.append('image', params.image)
  }

  return `nostrconnect://${params.clientPubkey}?${queryParams.toString()}`
}

export type BunkerSignerParams = {
  pool?: AbstractSimplePool
  onauth?: (url: string) => void
  /** Skip automatic switchRelays() call in fromURI. Useful when you want to call it manually at your own pace. */
  skipSwitchRelays?: boolean
  /** How long (in ms) to wait for a response before rejecting the request. Defaults to 30s. Set to 0 to wait forever. */
  timeout?: number
  /** Like timeout, but applied while waiting for the user to complete the `onauth()` flow. Defaults to 5 minutes. */
  authTimeout?: number
}

const DEFAULT_TIMEOUT = 30_000
const DEFAULT_AUTH_TIMEOUT = 300_000

function describeError(err: any): string {
  if (Array.isArray(err?.errors)) {
    if (!err.errors.length) return 'no relay was tried'
    return err.errors.map((e: any) => String(e?.message || e)).join('; ')
  }
  return String(err?.message || err)
}

export class BunkerSigner implements Signer {
  private params: BunkerSignerParams
  private pool: AbstractSimplePool
  private subCloser: SubCloser | undefined
  private isOpen: boolean
  private serial: number
  private idPrefix: string
  private subGeneration: number
  private listeners: {
    [id: string]: {
      method: string
      /** which subscription was active when this request was sent */
      generation: number
      timeout: ReturnType<typeof setTimeout> | undefined
      resolve: (_: string) => void
      reject: (_: Error) => void
    }
  }
  private waitingForAuth: { [id: string]: boolean }
  private secretKey: Uint8Array
  // If the client initiates the connection, the two variables below can be filled in later.
  private conversationKey!: Uint8Array
  public bp!: BunkerPointer

  private cachedPubKey: string | undefined

  /**
   * Creates a new instance of the Nip46 class.
   * @param relays - An array of relay addresses.
   * @param remotePubkey - An optional remote public key. This is the key you want to sign as.
   * @param secretKey - An optional key pair.
   */
  private constructor(clientSecretKey: Uint8Array, params: BunkerSignerParams) {
    this.params = params
    this.pool = params.pool || new SimplePool()
    this.secretKey = clientSecretKey
    this.isOpen = false
    this.idPrefix = Math.random().toString(36).substring(7)
    this.serial = 0
    this.subGeneration = 0
    this.listeners = {}
    this.waitingForAuth = {}
  }

  /**
   * [Factory Method 1] Creates a Signer using bunker information (bunker:// URL or NIP-05).
   * This method is used when the public key of the bunker is known in advance.
   */
  public static fromBunker(
    clientSecretKey: Uint8Array,
    bp: BunkerPointer,
    params: BunkerSignerParams = {},
  ): BunkerSigner {
    if (bp.relays.length === 0) {
      throw new Error('no relays specified for this bunker')
    }

    const signer = new BunkerSigner(clientSecretKey, params)

    signer.conversationKey = getConversationKey(clientSecretKey, bp.pubkey)
    signer.bp = bp

    signer.setupSubscription()
    return signer
  }

  /**
   * [Factory Method 2] Creates a Signer using a nostrconnect:// URI generated by the client.
   * In this method, the bunker initiates the connection by scanning the URI.
   */
  public static async fromURI(
    clientSecretKey: Uint8Array,
    connectionURI: string,
    bunkerParams: BunkerSignerParams = {},
    maxWaitOrAbort: number | AbortSignal = 300_000,
  ): Promise<BunkerSigner> {
    const uri = new URL(connectionURI)

    // the secret is what tells the bunker we asked for apart from anyone else who
    // saw the URI on the relay. without it there is nothing to compare the response
    // against, and any pubkey that answers would be accepted as our signer.
    const secret = uri.searchParams.get('secret')
    if (!secret) {
      throw new Error('nostrconnect:// URI has no secret')
    }

    const signer = new BunkerSigner(clientSecretKey, bunkerParams)
    const clientPubkey = getPublicKey(clientSecretKey)

    return new Promise((resolve, reject) => {
      let success = false
      const sub = signer.pool.subscribe(
        uri.searchParams.getAll('relay'),
        {
          kinds: [NostrConnect],
          '#p': [clientPubkey],
          limit: 0,
        },
        {
          onevent: async (event: NostrEvent) => {
            try {
              const tempConvKey = getConversationKey(clientSecretKey, event.pubkey)
              const decryptedContent = decrypt(event.content, tempConvKey)

              const response = JSON.parse(decryptedContent)

              if (response.result === secret) {
                sub.close()

                signer.bp = {
                  pubkey: event.pubkey,
                  relays: uri.searchParams.getAll('relay'),
                  secret,
                }
                signer.conversationKey = getConversationKey(clientSecretKey, event.pubkey)
                signer.setupSubscription()

                success = true
                if (!bunkerParams.skipSwitchRelays) {
                  await Promise.race([new Promise(resolve => setTimeout(resolve, 1000)), signer.switchRelays()])
                }
                resolve(signer)
              }
            } catch (e) {
              console.warn('failed to process potential connection event', e)
            }
          },
          onclose: () => {
            if (!success) reject(new Error('subscription closed before connection was established.'))
          },
          maxWait: typeof maxWaitOrAbort === 'number' ? maxWaitOrAbort : undefined,
          abort: typeof maxWaitOrAbort !== 'number' ? maxWaitOrAbort : undefined,
        },
      )
    })
  }

  private setupSubscription() {
    const listeners = this.listeners
    const waitingForAuth = this.waitingForAuth
    const convKey = this.conversationKey
    const generation = ++this.subGeneration

    this.subCloser = this.pool.subscribe(
      this.bp.relays,
      {
        kinds: [NostrConnect],
        authors: [this.bp.pubkey],
        '#p': [getPublicKey(this.secretKey)],
        limit: 0,
      },
      {
        onevent: async (event: NostrEvent) => {
          let o: { id?: string; result?: string; error?: string }
          try {
            o = JSON.parse(decrypt(event.content, convKey))
          } catch (_err) {
            // not a NIP-46 payload for this conversation (i.e. another signer instance using a
            // different conversation key, or garbage) -- it is not an answer to any of our requests
            return
          }
          const { id, result, error } = o
          if (!id) return

          if (result === 'auth_url' && waitingForAuth[id]) {
            delete waitingForAuth[id]

            if (this.params.onauth) {
              // the user may take a while to log in, so give this request more time
              this.armTimeout(id, this.params.authTimeout ?? DEFAULT_AUTH_TIMEOUT)
              this.params.onauth(error ?? '')
            } else {
              this.rejectListener(
                id,
                new Error(
                  `nostr-tools/nip46: remote signer ${this.bp.pubkey} requires auth to answer "${listeners[id]?.method}" but there was no onauth() callback configured`,
                ),
              )
            }
            return
          }

          if (error !== undefined && error !== null) {
            this.rejectListener(id, new Error(error))
          } else if (result !== undefined && result !== null) {
            this.resolveListener(id, result)
          } else {
            this.rejectListener(id, new Error('nostr-tools/nip46: remote signer response has neither result nor error'))
          }
        },
        onclose: () => {
          if (this.subGeneration === generation) this.subCloser = undefined
          // the subscription this request was sent on is gone, so its answer will never arrive
          this.rejectAll(new Error('nostr-tools/nip46: subscription to the remote signer was closed'), generation)
        },
      },
    )
    this.isOpen = true
  }

  /** schedule a rejection of the request `id` if its answer doesn't arrive in `ms` milliseconds */
  private armTimeout(id: string, ms: number) {
    const handler = this.listeners[id]
    if (!handler) return
    if (handler.timeout) clearTimeout(handler.timeout)
    if (!Number.isFinite(ms) || ms <= 0) return
    const timer: any = setTimeout(() => {
      this.rejectListener(id, new Error(`nostr-tools/nip46: timeout after ${ms}ms waiting for "${handler.method}"`))
    }, ms)
    timer?.unref?.()
    handler.timeout = timer
  }

  /** settle the request `id`, cleaning up its listener and timer. a no-op if already settled. */
  private finishRequest(id: string, result: string | Error) {
    const handler = this.listeners[id]
    if (!handler) return
    delete this.listeners[id]
    delete this.waitingForAuth[id]
    if (handler.timeout) clearTimeout(handler.timeout)
    if (result instanceof Error) handler.reject(result)
    else handler.resolve(result)
  }

  private resolveListener(id: string, result: string) {
    this.finishRequest(id, result)
  }

  private rejectListener(id: string, error: Error) {
    this.finishRequest(id, error instanceof Error ? error : new Error(String(error)))
  }

  /** reject every pending request, optionally only those sent on subscription `generation` */
  private rejectAll(error: Error, generation?: number) {
    for (const id of Object.keys(this.listeners)) {
      if (generation !== undefined && this.listeners[id].generation !== generation) continue
      this.rejectListener(id, error)
    }
  }

  async switchRelays(): Promise<boolean> {
    try {
      const switchResp = await this.sendRequest('switch_relays', [])
      let relays = JSON.parse(switchResp) as string[] | null
      if (!relays) return false
      if (JSON.stringify(relays.sort()) === JSON.stringify(this.bp.relays)) return false

      this.bp.relays = relays
      let previousCloser = this.subCloser!
      setTimeout(() => {
        previousCloser.close()
      }, 5000)

      this.subCloser = undefined
      this.setupSubscription()
      return true
    } catch {
      return false
    }
  }

  // closes the subscription -- this object can't be used anymore after this
  async close() {
    this.isOpen = false
    this.rejectAll(new Error('nostr-tools/nip46: signer was closed'))
    this.subCloser?.close()
    this.subCloser = undefined
  }

  async sendRequest(method: string, params: string[]): Promise<string> {
    if (!this.isOpen) throw new Error('this signer is not open anymore, create a new one')
    if (!this.subCloser) this.setupSubscription()

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

    return new Promise<string>((resolve, reject) => {
      // setup callback listener
      this.listeners[id] = { method, generation: this.subGeneration, timeout: undefined, resolve, reject }
      this.waitingForAuth[id] = true
      this.armTimeout(id, this.params.timeout ?? DEFAULT_TIMEOUT)

      // publish the event
      Promise.any(this.pool.publish(this.bp.relays, verifiedEvent)).catch((err: any) => {
        this.rejectListener(
          id,
          new Error(`nostr-tools/nip46: failed to send "${method}" to any relay: ${describeError(err)}`),
        )
      })
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
  async connect(clientMetadata?: ClientMetadata): Promise<void> {
    const params = [this.bp.pubkey, this.bp.secret || '']
    if (clientMetadata) {
      params.push('')
      params.push(JSON.stringify(clientMetadata))
    }
    await this.sendRequest('connect', params)
  }

  /**
   * Calls the "logout" method on the bunker and closes the local session.
   * The client secret key should be discarded by the caller after this.
   */
  async logout(): Promise<void> {
    let resp = await this.sendRequest('logout', [])
    if (resp !== 'ack') throw new Error(`result is not ack: ${resp}`)
    await this.close()
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
  if (email && !EMAIL_REGEX.test(email)) throw new Error('invalid email')

  let rpc = BunkerSigner.fromBunker(localSecretKey, bunker.bunkerPointer, params)

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
