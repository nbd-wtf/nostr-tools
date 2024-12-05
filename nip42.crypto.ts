import { schnorr } from '@noble/curves/secp256k1'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'
import { sha256 } from '@noble/hashes/sha256'
import type { Event, UnsignedEvent } from './core'

/**
 * Generate a NIP-42 auth challenge event
 * @param serverPrivateKey - Server's private key in hex format
 * @param clientPubkey - Client's public key
 * @param relayUrl - URL of the relay issuing the challenge
 * @returns A signed challenge event
 */
export async function generateAuthChallenge(
  serverPrivateKey: string,
  clientPubkey: string,
  relayUrl: string
): Promise<Event> {
  const timestamp = Math.floor(Date.now() / 1000)
  // Use schnorr's utils for random bytes instead of Node's crypto
  const randomValue = bytesToHex(schnorr.utils.randomPrivateKey())
  const privateKeyBytes = hexToBytes(serverPrivateKey)
  const pubkey = getPublicKeyFromPrivateKey(privateKeyBytes)
  
  const unsignedEvent: UnsignedEvent = {
    kind: 22242,
    created_at: timestamp,
    tags: [
      ['p', clientPubkey],
      ['relay', relayUrl],
      ['challenge', randomValue]
    ],
    content: '',
    pubkey
  }

  return await signEvent(unsignedEvent, privateKeyBytes)
}

/**
 * Get the public key from a private key
 * @param privateKey - Private key as Uint8Array
 * @returns Public key in hex format
 */
export function getPublicKeyFromPrivateKey(privateKey: Uint8Array): string {
  return bytesToHex(schnorr.getPublicKey(privateKey))
}

/**
 * Generate a new keypair for NIP-42 auth
 * @returns Object containing private and public keys in hex format
 */
export function generateKeyPair(): { privateKey: string; publicKey: string } {
  const privateKey = schnorr.utils.randomPrivateKey()
  const publicKey = schnorr.getPublicKey(privateKey)
  return {
    privateKey: bytesToHex(privateKey),
    publicKey: bytesToHex(publicKey)
  }
}

/**
 * Sign a Nostr event
 * @param event - Unsigned event
 * @param privateKey - Private key as Uint8Array
 * @returns Signed event
 */
export async function signEvent(event: UnsignedEvent, privateKey: Uint8Array): Promise<Event> {
  const hash = hexToBytes(generateEventHash(event))
  const sig = await signHash(hash, privateKey)
  return { ...event, id: bytesToHex(hash), sig }
}

/**
 * Verify a Nostr event signature
 * @param signature - Signature in hex format
 * @param hash - Event hash as Uint8Array
 * @param publicKey - Public key in hex format
 * @returns True if signature is valid
 */
export async function verifySignature(
  signature: string,
  hash: Uint8Array,
  publicKey: string
): Promise<boolean> {
  try {
    return await schnorr.verify(
      hexToBytes(signature),
      hash,
      hexToBytes(publicKey)
    )
  } catch (error) {
    console.error('Failed to verify signature:', error)
    return false
  }
}

// Private helper functions

function serializeEvent(event: Partial<Event>): string {
  return JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content
  ])
}

function generateEventHash(event: Partial<Event>): string {
  const serialized = serializeEvent(event)
  const hash = sha256(Buffer.from(serialized))
  return bytesToHex(hash)
}

async function signHash(hash: Uint8Array, privateKey: Uint8Array): Promise<string> {
  const signature = await schnorr.sign(hash, privateKey)
  return bytesToHex(signature)
}
