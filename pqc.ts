import { ml_kem1024 } from '@noble/post-quantum/ml-kem.js'
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js'
import { extract as hkdfExtract, expand as hkdfExpand } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import { randomBytes } from '@noble/hashes/utils.js'
import { mnemonicToSeedSync } from '@scure/bip39'
import { base64 } from '@scure/base'

import { finalizeEvent, generateSecretKey, getPublicKey, verifyEvent } from './pure.ts'
import { getConversationKey, encrypt as nip44Encrypt, decrypt as nip44Decrypt } from './nip44.ts'
import type { Event, EventTemplate, UnsignedEvent } from './core.ts'
import { GiftWrap, Seal } from './kinds.ts'

/**
 * Post-quantum identity keys and messages.
 *
 * Derives ML-KEM-1024 and ML-DSA-87 keys ([FIPS 203] / [FIPS 204]) from the same BIP-39
 * seed NIP-06 already uses, publishes them in a replaceable `kind:10203` attestation, and
 * carries post-quantum encrypted direct messages inside NIP-59 gift wrap unchanged.
 *
 * Every Nostr public key is published, and Shor's algorithm recovers a private key from a
 * public one. That means every NIP-44 event published today is a future plaintext: an
 * adversary archiving traffic now can decrypt all of it once secp256k1 falls. This module
 * addresses that, and only that.
 *
 * The keys are derived as SIBLINGS of the secp256k1 key, never FROM it. Deriving the
 * post-quantum key from the Nostr private key is circular — an adversary who recovers that
 * key from the published pubkey repeats the derivation and obtains the post-quantum key
 * too. Because BIP-32 and HKDF are one-way, recovering the secp256k1 key reveals nothing
 * about the seed, so keys derived from the seed survive.
 *
 * What this does NOT do: it does not stop event forgery. Events are still signed with
 * secp256k1, so a quantum adversary can sign as any user and can publish a replacement
 * attestation carrying their own keys to intercept future messages. It makes *past*
 * messages permanently confidential, which is the only half of the problem that cannot be
 * fixed after the fact.
 *
 * [FIPS 203]: https://csrc.nist.gov/pubs/fips/203/final
 * [FIPS 204]: https://csrc.nist.gov/pubs/fips/204/final
 */

/** Replaceable event kind carrying post-quantum public keys. */
export const PQCKeys = 10203

/** Derivation profile. Bump when the derivation changes. */
export const PROFILE = 'nip-pqc/v1'

export const ALG_KEM = 'ml-kem-1024'
export const ALG_DSA = 'ml-dsa-87'

/** Public key sizes, per FIPS 203 / 204. */
export const KEM_PUBLIC_KEY_BYTES = 1568
export const DSA_PUBLIC_KEY_BYTES = 2592
/** ML-KEM-1024 ciphertext length. */
export const KEM_CIPHERTEXT_BYTES = 1568

const KEM_SEED_BYTES = 64 // d || z
const DSA_SEED_BYTES = 32 // xi
const NONCE_BYTES = 24
const TAG_BYTES = 16
const HEADER_BYTES = 2 + KEM_CIPHERTEXT_BYTES + NONCE_BYTES

/** Envelope format version. */
export const ENVELOPE_VERSION = 0x01
/** ML-KEM-1024 + NIP-44 conversation key, sealed with XChaCha20-Poly1305. */
export const ALG_MLKEM1024_XCHACHA = 0x01

/** Largest plaintext this envelope will carry, matching NIP-44's ceiling. */
export const MAX_PLAINTEXT_BYTES = 65535

const utf8Encoder = new TextEncoder()
const utf8Decoder = new TextDecoder()

export type PQKeyPair = { publicKey: Uint8Array; secretKey: Uint8Array }
export type PQKeys = { kem: PQKeyPair; dsa: PQKeyPair }
export type PQOrigin = 'derived' | 'independent'

// ---------------------------------------------------------------- derivation

function deriveSeed(seed: Uint8Array, info: string, length: number): Uint8Array {
  const prk = hkdfExtract(sha256, seed, undefined)
  try {
    return hkdfExpand(sha256, prk, utf8Encoder.encode(info), length)
  } finally {
    prk.fill(0)
  }
}

export function kemInfo(accountIndex = 0): string {
  return `${PROFILE}/${ALG_KEM}/${accountIndex}`
}

export function dsaInfo(accountIndex = 0): string {
  return `${PROFILE}/${ALG_DSA}/${accountIndex}`
}

/**
 * Derive both post-quantum key pairs from a BIP-39 seed.
 *
 * @param seed the 64-byte BIP-39 seed. NOT a secp256k1 private key — passing one yields
 *             different, unrelated keys and defeats the design.
 */
export function keysFromSeed(seed: Uint8Array, accountIndex = 0): PQKeys {
  if (!(seed instanceof Uint8Array) || seed.length === 0) throw new Error('invalid seed')
  if (!Number.isInteger(accountIndex) || accountIndex < 0) throw new Error('invalid account index')

  const kemSeed = deriveSeed(seed, kemInfo(accountIndex), KEM_SEED_BYTES)
  const dsaSeed = deriveSeed(seed, dsaInfo(accountIndex), DSA_SEED_BYTES)
  try {
    return { kem: ml_kem1024.keygen(kemSeed), dsa: ml_dsa87.keygen(dsaSeed) }
  } finally {
    kemSeed.fill(0)
    dsaSeed.fill(0)
  }
}

/**
 * Derive post-quantum keys from a NIP-06 mnemonic.
 *
 * Requires 24 words. A 12-word mnemonic expands to the same 64-byte seed but carries only
 * 128 bits of entropy, which would make the seed — not the algorithm — the limiting factor.
 * Identities holding one should publish an independently generated key instead.
 */
export function keysFromSeedWords(mnemonic: string, passphrase?: string, accountIndex = 0): PQKeys {
  const words = mnemonic.trim().split(/\s+/).length
  if (words !== 24) {
    throw new Error(`post-quantum keys require a 24-word mnemonic, got ${words} words`)
  }
  const seed = mnemonicToSeedSync(mnemonic, passphrase)
  try {
    return keysFromSeed(seed, accountIndex)
  } finally {
    seed.fill(0)
  }
}

// ------------------------------------------------------- proof of possession

/**
 * The message the ML-DSA key signs, binding the npub and both post-quantum keys.
 *
 * ML-KEM cannot sign, so this counter-signature is what gives the encapsulation key a
 * possession proof at all.
 */
export function popMessage(pubkey: string, kemB64: string, dsaB64: string): Uint8Array {
  return utf8Encoder.encode(`${PROFILE}/pop:${pubkey}:${kemB64}:${dsaB64}`)
}

export function signPop(message: Uint8Array, dsaSecretKey: Uint8Array): Uint8Array {
  return ml_dsa87.sign(message, dsaSecretKey)
}

export function verifyPop(signature: Uint8Array, message: Uint8Array, dsaPublicKey: Uint8Array): boolean {
  try {
    return ml_dsa87.verify(signature, message, dsaPublicKey)
  } catch {
    return false
  }
}

// --------------------------------------------------------------- attestation

/** Build and sign a `kind:10203` attestation advertising an identity's post-quantum keys. */
export function makeAttestation(
  keys: PQKeys,
  secretKey: Uint8Array,
  origin: PQOrigin = 'derived',
  createdAt = Math.floor(Date.now() / 1000),
): Event {
  const pubkey = getPublicKey(secretKey)
  const kemB64 = base64.encode(keys.kem.publicKey)
  const dsaB64 = base64.encode(keys.dsa.publicKey)
  const pop = signPop(popMessage(pubkey, kemB64, dsaB64), keys.dsa.secretKey)

  const tags: string[][] = [
    ['alg', ALG_KEM, kemB64],
    ['alg', ALG_DSA, dsaB64],
    ['origin', origin],
  ]
  if (origin === 'derived') tags.push(['seed_strength', '256'])
  tags.push(['v', PROFILE], ['pop', ALG_DSA, base64.encode(pop)])

  return finalizeEvent({ kind: PQCKeys, created_at: createdAt, tags, content: '' } as EventTemplate, secretKey)
}

export type PQProblem =
  | 'key-length'
  | 'no-alg-tags'
  | 'no-kem'
  | 'derived-weak-seed'
  | 'derived-missing-seed-strength'
  | 'missing-pop'
  | 'pop-failed'

export type PQAttestation = {
  pubkey: string
  kem: Uint8Array | null
  dsa: Uint8Array | null
  origin: PQOrigin | null
  seedStrength: string | null
  popValid: boolean | null
  problems: PQProblem[]
  /** Only true when a KEM key is present and nothing failed validation. */
  usable: boolean
}

/**
 * Parse and validate a `kind:10203` attestation.
 *
 * Strict by design: a malformed or unproven attestation is reported `usable: false` with an
 * explicit problem list rather than partially accepted. The failure this guards against is a
 * sender believing a recipient is reachable post-quantum when they are not — silently
 * falling back to classic encryption is the worst outcome available.
 *
 * Does NOT verify the event's signature; call `verifyEvent` yourself first.
 */
export function parseAttestation(event: Event): PQAttestation {
  const problems: PQProblem[] = []
  let kem: Uint8Array | null = null
  let dsa: Uint8Array | null = null
  let kemB64 = ''
  let dsaB64 = ''

  const algTags = event.tags.filter(t => t[0] === 'alg' && t.length >= 3)
  for (const t of algTags) {
    const alg = t[1]
    const expected = alg === ALG_KEM ? KEM_PUBLIC_KEY_BYTES : alg === ALG_DSA ? DSA_PUBLIC_KEY_BYTES : null
    if (expected === null) continue // unknown algorithms are ignored, not an error
    let bytes: Uint8Array
    try {
      bytes = base64.decode(t[2])
    } catch {
      problems.push('key-length')
      continue
    }
    if (bytes.length !== expected) {
      problems.push('key-length')
      continue
    }
    if (alg === ALG_KEM) {
      kem = bytes
      kemB64 = t[2]
    } else {
      dsa = bytes
      dsaB64 = t[2]
    }
  }

  if (algTags.length === 0) problems.push('no-alg-tags')
  if (!kem) problems.push('no-kem')

  const first = (name: string) => event.tags.find(t => t[0] === name)?.[1] ?? null
  const originRaw = first('origin')
  const origin: PQOrigin | null = originRaw === 'derived' || originRaw === 'independent' ? originRaw : null
  const seedStrength = first('seed_strength')

  if (origin === 'derived') {
    if (!seedStrength) problems.push('derived-missing-seed-strength')
    else if (seedStrength !== '256') problems.push('derived-weak-seed')
  }

  const popTag = event.tags.find(t => t[0] === 'pop' && t.length >= 3)
  let popValid: boolean | null = null
  if (dsa && !popTag) {
    problems.push('missing-pop')
  } else if (popTag && dsa && kem) {
    popValid = verifyPop(base64.decode(popTag[2]), popMessage(event.pubkey, kemB64, dsaB64), dsa)
    if (!popValid) problems.push('pop-failed')
  }

  return { pubkey: event.pubkey, kem, dsa, origin, seedStrength, popValid, problems, usable: kem !== null && problems.length === 0 }
}

/** Filter for fetching identities' attestations. */
export function attestationFilter(pubkeys: string[]) {
  return { kinds: [PQCKeys], authors: pubkeys }
}

// ------------------------------------------------------------------ envelope

/**
 * Combine the post-quantum shared secret with the classic NIP-44 conversation key.
 *
 * The KEM secret MUST NOT be used alone. Hashing both together means the result is no weaker
 * than either input, so a flaw in a comparatively young lattice scheme cannot make messaging
 * worse than it is today.
 */
export function hybridKey(sharedSecret: Uint8Array, conversationKey: Uint8Array): Uint8Array {
  const ikm = new Uint8Array(sharedSecret.length + conversationKey.length)
  ikm.set(sharedSecret, 0)
  ikm.set(conversationKey, sharedSecret.length)
  const prk = hkdfExtract(sha256, ikm, undefined)
  try {
    return hkdfExpand(sha256, prk, utf8Encoder.encode(`${PROFILE}/hybrid`), 32)
  } finally {
    ikm.fill(0)
    prk.fill(0)
  }
}

function calcPaddedLen(len: number): number {
  if (len <= 32) return 32
  const nextPower = 1 << (Math.floor(Math.log2(len - 1)) + 1)
  const chunk = nextPower <= 256 ? 32 : nextPower / 8
  return chunk * (Math.floor((len - 1) / chunk) + 1)
}

function pad(plaintext: Uint8Array): Uint8Array {
  if (plaintext.length === 0) throw new Error('cannot encrypt an empty message')
  if (plaintext.length > MAX_PLAINTEXT_BYTES) throw new Error('message too long')
  const padded = new Uint8Array(2 + calcPaddedLen(plaintext.length))
  new DataView(padded.buffer).setUint16(0, plaintext.length, false)
  padded.set(plaintext, 2)
  return padded
}

function unpad(padded: Uint8Array): Uint8Array {
  if (padded.length < 2) throw new Error('bad padding')
  const len = new DataView(padded.buffer, padded.byteOffset, padded.byteLength).getUint16(0, false)
  if (len === 0 || len > MAX_PLAINTEXT_BYTES) throw new Error('bad padding')
  const out = padded.subarray(2, 2 + len)
  if (out.length !== len || padded.length !== 2 + calcPaddedLen(len)) throw new Error('bad padding')
  return out
}

/**
 * Bind the framing to the ciphertext: version, algorithm, and both pubkeys.
 *
 * Without this a ciphertext could be replayed into a different conversation, have its
 * direction reversed, or have its algorithm byte silently downgraded.
 */
function associatedData(parties: { sender: string; recipient: string }, kemCt: Uint8Array): Uint8Array {
  const prefix = utf8Encoder.encode(
    `${PROFILE}/env:${ENVELOPE_VERSION}:${ALG_MLKEM1024_XCHACHA}:${parties.sender}:${parties.recipient}:`,
  )
  const ad = new Uint8Array(prefix.length + kemCt.length)
  ad.set(prefix, 0)
  ad.set(kemCt, prefix.length)
  return ad
}

/**
 * Encrypt to a recipient's ML-KEM key, hybridised with the classic conversation key.
 *
 * Wire format, base64-encoded:
 *
 *     version 1B | alg 1B | kem_ct 1568B | nonce 24B | AEAD(padded plaintext)
 *
 * The envelope carries its own version byte rather than claiming one in NIP-44's registry,
 * so it can be adopted, renumbered or superseded without colliding with NIP-44's own
 * versioning.
 */
export function encrypt(
  plaintext: string,
  recipientKemKey: Uint8Array,
  conversationKey: Uint8Array,
  parties: { sender: string; recipient: string },
): string {
  if (recipientKemKey.length !== KEM_PUBLIC_KEY_BYTES) throw new Error('invalid ML-KEM public key length')
  if (conversationKey.length !== 32) throw new Error('invalid conversation key')

  const { cipherText: kemCt, sharedSecret } = ml_kem1024.encapsulate(recipientKemKey)
  const key = hybridKey(sharedSecret, conversationKey)
  const nonce = randomBytes(NONCE_BYTES)
  try {
    const sealed = xchacha20poly1305(key, nonce, associatedData(parties, kemCt)).encrypt(
      pad(utf8Encoder.encode(plaintext)),
    )
    const out = new Uint8Array(HEADER_BYTES + sealed.length)
    out[0] = ENVELOPE_VERSION
    out[1] = ALG_MLKEM1024_XCHACHA
    out.set(kemCt, 2)
    out.set(nonce, 2 + KEM_CIPHERTEXT_BYTES)
    out.set(sealed, HEADER_BYTES)
    return base64.encode(out)
  } finally {
    key.fill(0)
    sharedSecret.fill(0)
  }
}

/**
 * Decrypt an envelope.
 *
 * Throws one generic error for every failure. Distinguishing bad padding from a bad tag
 * from a wrong key would hand an attacker an oracle.
 */
export function decrypt(
  payload: string,
  kemSecretKey: Uint8Array,
  conversationKey: Uint8Array,
  parties: { sender: string; recipient: string },
): string {
  try {
    if (conversationKey.length !== 32) throw new Error('x')
    const bytes = base64.decode(payload)
    if (bytes.length < HEADER_BYTES + TAG_BYTES) throw new Error('x')
    if (bytes[0] !== ENVELOPE_VERSION || bytes[1] !== ALG_MLKEM1024_XCHACHA) throw new Error('x')

    const kemCt = bytes.subarray(2, 2 + KEM_CIPHERTEXT_BYTES)
    const nonce = bytes.subarray(2 + KEM_CIPHERTEXT_BYTES, HEADER_BYTES)
    const sealed = bytes.subarray(HEADER_BYTES)

    const sharedSecret = ml_kem1024.decapsulate(kemCt, kemSecretKey)
    const key = hybridKey(sharedSecret, conversationKey)
    try {
      return utf8Decoder.decode(
        unpad(xchacha20poly1305(key, nonce, associatedData(parties, kemCt)).decrypt(sealed)),
      )
    } finally {
      key.fill(0)
      sharedSecret.fill(0)
    }
  } catch {
    throw new Error('decryption failed')
  }
}

/** Cheap check that a string looks like a post-quantum envelope. */
export function isEnvelope(payload: string): boolean {
  try {
    const bytes = base64.decode(payload)
    return bytes.length >= HEADER_BYTES + TAG_BYTES && bytes[0] === ENVELOPE_VERSION && bytes[1] === ALG_MLKEM1024_XCHACHA
  } catch {
    return false
  }
}

// ----------------------------------------------------------- direct messages

const PQ_TAG = ['encrypted', PROFILE]

function randomPastTimestamp(): number {
  return Math.round(Date.now() / 1000 - Math.random() * 172800)
}

/**
 * Wrap a post-quantum message for a recipient, per NIP-59.
 *
 * The envelope is the seal's content rather than the rumor's. NIP-59 base64-encodes at
 * every layer, so a payload placed in the rumor is expanded by 4/3 three times over;
 * one layer out removes an entire expansion of the 1568-byte ML-KEM ciphertext, worth
 * 16-28% of total message size. It is also the natural place — the seal is already where
 * NIP-59 puts the rumor's confidentiality.
 *
 * The result is an ordinary `kind:1059` gift wrap. Relays need no changes, and clients that
 * do not implement this are unaffected.
 */
export function wrapEvent(
  senderSecretKey: Uint8Array,
  recipientPublicKey: string,
  recipientKemKey: Uint8Array,
  message: string,
  extraTags: string[][] = [],
): Event {
  const senderPubkey = getPublicKey(senderSecretKey)
  const conversationKey = getConversationKey(senderSecretKey, recipientPublicKey)

  const rumor: UnsignedEvent = {
    kind: 14,
    pubkey: senderPubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['p', recipientPublicKey], PQ_TAG, ...extraTags],
    content: message,
  }

  const seal = finalizeEvent(
    {
      kind: Seal,
      created_at: randomPastTimestamp(),
      tags: [],
      content: encrypt(JSON.stringify(rumor), recipientKemKey, conversationKey, {
        sender: senderPubkey,
        recipient: recipientPublicKey,
      }),
    } as EventTemplate,
    senderSecretKey,
  )

  const ephemeral = generateSecretKey()
  return finalizeEvent(
    {
      kind: GiftWrap,
      created_at: randomPastTimestamp(),
      tags: [['p', recipientPublicKey]],
      content: nip44Encrypt(JSON.stringify(seal), getConversationKey(ephemeral, recipientPublicKey)),
    } as EventTemplate,
    ephemeral,
  )
}

/**
 * Unwrap a post-quantum gift wrap.
 *
 * Returns `null` when the wrap is not a post-quantum message, so a post-quantum-aware
 * client does not choke on ordinary NIP-17 traffic.
 *
 * Rejects a rumor whose author differs from the seal's signer. The rumor is unsigned by
 * design, so its `pubkey` is only a claim; without this check anyone could wrap a rumor
 * attributed to someone else and have the recipient display it as genuine.
 */
export function unwrapEvent(
  wrap: Event,
  recipientSecretKey: Uint8Array,
  recipientKemSecretKey: Uint8Array,
): UnsignedEvent | null {
  const recipientPubkey = getPublicKey(recipientSecretKey)
  const seal = JSON.parse(nip44Decrypt(wrap.content, getConversationKey(recipientSecretKey, wrap.pubkey))) as Event

  if (seal.kind !== Seal) throw new Error('not a seal')
  if (!verifyEvent(seal)) throw new Error('seal signature does not verify')
  if (!isEnvelope(seal.content)) return null

  const rumor = JSON.parse(
    decrypt(seal.content, recipientKemSecretKey, getConversationKey(recipientSecretKey, seal.pubkey), {
      sender: seal.pubkey,
      recipient: recipientPubkey,
    }),
  ) as UnsignedEvent

  if (rumor.kind !== 14) return null
  if (rumor.pubkey !== seal.pubkey) throw new Error('rumor author does not match seal')
  return rumor
}
