import { describe, it, expect } from 'vitest'
import {
  generateAuthChallenge,
  generateKeyPair,
  getPublicKeyFromPrivateKey,
  verifySignature
} from './nip42.crypto'
import { hexToBytes } from '@noble/hashes/utils'

describe('NIP-42 Crypto Operations', () => {
  it('should generate valid keypairs', () => {
    const { privateKey, publicKey } = generateKeyPair()
    expect(privateKey).toHaveLength(64) // 32 bytes in hex
    expect(publicKey).toHaveLength(64) // 32 bytes in hex
    
    // Public key should be derivable from private key
    const derivedPubkey = getPublicKeyFromPrivateKey(hexToBytes(privateKey))
    expect(derivedPubkey).toBe(publicKey)
  })

  it('should generate valid auth challenges', async () => {
    const { privateKey, publicKey } = generateKeyPair()
    const clientKeys = generateKeyPair()
    const relayUrl = 'wss://relay.example.com'

    const challenge = await generateAuthChallenge(
      privateKey,
      clientKeys.publicKey,
      relayUrl
    )

    // Verify challenge properties
    expect(challenge.kind).toBe(22242)
    expect(challenge.pubkey).toBe(publicKey)
    expect(challenge.content).toBe('')
    expect(challenge.tags).toHaveLength(3)
    expect(challenge.tags[0][0]).toBe('p')
    expect(challenge.tags[0][1]).toBe(clientKeys.publicKey)
    expect(challenge.tags[1][0]).toBe('relay')
    expect(challenge.tags[1][1]).toBe(relayUrl)
    expect(challenge.tags[2][0]).toBe('challenge')
    expect(challenge.tags[2][1]).toHaveLength(64) // 32 bytes random value

    // Verify signature
    const isValid = await verifySignature(
      challenge.sig,
      hexToBytes(challenge.id),
      publicKey
    )
    expect(isValid).toBe(true)
  })
})
