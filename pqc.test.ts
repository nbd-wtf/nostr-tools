import { test, expect } from 'bun:test'
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { mnemonicToSeedSync } from '@scure/bip39'
import { base64 } from '@scure/base'

import { generateSecretKey, getPublicKey, finalizeEvent, verifyEvent } from './pure.ts'
import { privateKeyFromSeedWords } from './nip06.ts'
import { getConversationKey, encrypt as nip44Encrypt } from './nip44.ts'
import { GiftWrap, Seal } from './kinds.ts'
import {
  keysFromSeed,
  keysFromSeedWords,
  kemInfo,
  dsaInfo,
  makeAttestation,
  parseAttestation,
  attestationFilter,
  encrypt,
  decrypt,
  isEnvelope,
  hybridKey,
  wrapEvent,
  unwrapEvent,
  popMessage,
  signPop,
  PQCKeys,
  KEM_PUBLIC_KEY_BYTES,
  DSA_PUBLIC_KEY_BYTES,
  MAX_PLAINTEXT_BYTES,
} from './pqc.ts'

// The 24-word mnemonic published in NIP-06, and the key NIP-06 says it produces.
const MNEMONIC =
  'what bleak badge arrange retreat wolf trade produce cricket blur garlic valid proud rude strong choose busy staff weather area salt hollow arm fade'
const NIP06_PRIVATE_KEY = 'c15d739894c81a2fcfd3a2df85a0d2c0dbc47a280d092799f144d73d7ae78add'

const identity = () => {
  const sk = generateSecretKey()
  return { sk, pk: getPublicKey(sk), pq: keysFromSeed(randomBytes(64)) }
}

test('derives the secp256k1 key NIP-06 publishes from the same mnemonic', () => {
  expect(bytesToHex(privateKeyFromSeedWords(MNEMONIC))).toEqual(NIP06_PRIVATE_KEY)
})

test('derivation profile strings are stable', () => {
  expect(kemInfo(0)).toEqual('nip-pqc/v1/ml-kem-1024/0')
  expect(dsaInfo(0)).toEqual('nip-pqc/v1/ml-dsa-87/0')
})

test('produces the published test vectors', () => {
  const { kem, dsa } = keysFromSeedWords(MNEMONIC)
  expect(kem.publicKey.length).toEqual(KEM_PUBLIC_KEY_BYTES)
  expect(dsa.publicKey.length).toEqual(DSA_PUBLIC_KEY_BYTES)
  expect(bytesToHex(sha256(kem.publicKey))).toEqual(
    'f15e1a31adc3198a3e09f1d473aa0f2cd3e28392b77f1e350468bae15dfa251b',
  )
  expect(bytesToHex(sha256(dsa.publicKey))).toEqual(
    '6912f6f1dd8f8e6c1d9e7d349d75ef1b582ccf2aa95636bf2445b0e22be18e16',
  )
})

test('the same mnemonic always restores the same keys', () => {
  expect(keysFromSeedWords(MNEMONIC).kem.publicKey).toEqual(keysFromSeedWords(MNEMONIC).kem.publicKey)
})

test('refuses a 12-word mnemonic', () => {
  const twelve = 'leader monkey parrot ring guide accident before fence cannon height naive bean'
  expect(() => keysFromSeedWords(twelve)).toThrow(/24-word/)
})

test('deriving from the private key gives different keys', () => {
  // The tripwire. If anyone "simplifies" this to take the private key, the scheme becomes
  // circular — an adversary who recovers it from the pubkey repeats the derivation.
  const seed = mnemonicToSeedSync(MNEMONIC)
  const priv = hexToBytes(NIP06_PRIVATE_KEY)
  expect(keysFromSeed(seed).kem.publicKey).not.toEqual(keysFromSeed(priv).kem.publicKey)
})

test('attestation round-trips and its proof of possession verifies', () => {
  const sk = generateSecretKey()
  const keys = keysFromSeedWords(MNEMONIC)
  const event = makeAttestation(keys, sk)

  expect(event.kind).toEqual(PQCKeys)
  expect(verifyEvent(event)).toBeTrue()

  const att = parseAttestation(event)
  expect(att.usable).toBeTrue()
  expect(att.popValid).toBeTrue()
  expect(att.origin).toEqual('derived')
  expect(att.seedStrength).toEqual('256')
  expect(att.problems).toEqual([])
})

test('attestation rejects a substituted KEM key', () => {
  const sk = generateSecretKey()
  const keys = keysFromSeedWords(MNEMONIC)
  const event = makeAttestation(keys, sk)
  const other = keysFromSeed(randomBytes(64))
  event.tags = event.tags.map(t =>
    t[0] === 'alg' && t[1] === 'ml-kem-1024' ? ['alg', 'ml-kem-1024', base64.encode(other.kem.publicKey)] : t,
  )
  const att = parseAttestation(event)
  expect(att.popValid).toBeFalse()
  expect(att.usable).toBeFalse()
  expect(att.problems).toContain('pop-failed')
})

test('attestation rejects a derived claim from a weak seed', () => {
  const event = makeAttestation(keysFromSeedWords(MNEMONIC), generateSecretKey())
  event.tags = event.tags.map(t => (t[0] === 'seed_strength' ? ['seed_strength', '128'] : t))
  expect(parseAttestation(event).problems).toContain('derived-weak-seed')
})

test('attestationFilter targets the right kind', () => {
  expect(attestationFilter(['ab'.repeat(32)])).toEqual({ kinds: [PQCKeys], authors: ['ab'.repeat(32)] })
})

test('envelope round-trips', () => {
  const alice = identity()
  const bob = identity()
  const conv = getConversationKey(alice.sk, bob.pk)
  const parties = { sender: alice.pk, recipient: bob.pk }
  const payload = encrypt('hello post-quantum', bob.pq.kem.publicKey, conv, parties)
  expect(isEnvelope(payload)).toBeTrue()
  expect(decrypt(payload, bob.pq.kem.secretKey, conv, parties)).toEqual('hello post-quantum')
})

test('envelope handles unicode and the maximum length', () => {
  const alice = identity()
  const bob = identity()
  const conv = getConversationKey(alice.sk, bob.pk)
  const parties = { sender: alice.pk, recipient: bob.pk }
  for (const msg of ['ni hao 你好 — Grüße 🔐', 'x', 'z'.repeat(MAX_PLAINTEXT_BYTES)]) {
    expect(decrypt(encrypt(msg, bob.pq.kem.publicKey, conv, parties), bob.pq.kem.secretKey, conv, parties)).toEqual(msg)
  }
})

test('envelope padding hides message length', () => {
  const alice = identity()
  const bob = identity()
  const conv = getConversationKey(alice.sk, bob.pk)
  const parties = { sender: alice.pk, recipient: bob.pk }
  const sizes = ['a', 'ab', 'a'.repeat(32)].map(m => encrypt(m, bob.pq.kem.publicKey, conv, parties).length)
  expect(new Set(sizes).size).toEqual(1)
})

test('envelope binds both halves of the hybrid', () => {
  // If either of these passed, one layer would be decorative and it would not be hybrid.
  const alice = identity()
  const bob = identity()
  const other = identity()
  const conv = getConversationKey(alice.sk, bob.pk)
  const parties = { sender: alice.pk, recipient: bob.pk }
  const payload = encrypt('hybrid matters', bob.pq.kem.publicKey, conv, parties)

  const wrongConv = getConversationKey(alice.sk, other.pk)
  expect(() => decrypt(payload, bob.pq.kem.secretKey, wrongConv, parties)).toThrow(/decryption failed/)
  expect(() => decrypt(payload, other.pq.kem.secretKey, conv, parties)).toThrow(/decryption failed/)
})

test('envelope rejects replay into another conversation', () => {
  const alice = identity()
  const bob = identity()
  const conv = getConversationKey(alice.sk, bob.pk)
  const payload = encrypt('for bob', bob.pq.kem.publicKey, conv, { sender: alice.pk, recipient: bob.pk })
  expect(() =>
    decrypt(payload, bob.pq.kem.secretKey, conv, { sender: 'cc'.repeat(32), recipient: bob.pk }),
  ).toThrow(/decryption failed/)
})

test('envelope rejects tampering and downgrade', () => {
  const alice = identity()
  const bob = identity()
  const conv = getConversationKey(alice.sk, bob.pk)
  const parties = { sender: alice.pk, recipient: bob.pk }
  const payload = encrypt('secret', bob.pq.kem.publicKey, conv, parties)

  const flip = (i: number) => {
    const b = base64.decode(payload)
    b[i] = b[i] ^ 0xff
    return base64.encode(b)
  }
  expect(() => decrypt(flip(1), bob.pq.kem.secretKey, conv, parties)).toThrow() // algorithm byte
  expect(() => decrypt(flip(10), bob.pq.kem.secretKey, conv, parties)).toThrow() // KEM ciphertext
  expect(() => decrypt(flip(base64.decode(payload).length - 3), bob.pq.kem.secretKey, conv, parties)).toThrow()
})

test('hybridKey depends on both inputs', () => {
  const a = new Uint8Array(32).fill(1)
  const b = new Uint8Array(32).fill(2)
  const base = hybridKey(a, b)
  expect(base.length).toEqual(32)
  expect(hybridKey(new Uint8Array(32).fill(9), b)).not.toEqual(base)
  expect(hybridKey(a, new Uint8Array(32).fill(9))).not.toEqual(base)
})

test('gift-wrapped message round-trips', () => {
  const alice = identity()
  const bob = identity()
  const wrap = wrapEvent(alice.sk, bob.pk, bob.pq.kem.publicKey, 'the whole point')

  expect(wrap.kind).toEqual(GiftWrap)
  expect(verifyEvent(wrap)).toBeTrue()

  const rumor = unwrapEvent(wrap, bob.sk, bob.pq.kem.secretKey)
  expect(rumor).not.toBeNull()
  expect(rumor!.content).toEqual('the whole point')
  expect(rumor!.pubkey).toEqual(alice.pk)
})

test('the sender is not identifiable from the outside', () => {
  const alice = identity()
  const bob = identity()
  const wrap = wrapEvent(alice.sk, bob.pk, bob.pq.kem.publicKey, 'anonymous on the wire')
  expect(wrap.pubkey).not.toEqual(alice.pk)
  expect(JSON.stringify(wrap)).not.toContain(alice.pk)
})

test('the post-quantum key is load-bearing, not decorative', () => {
  // Bob's classic key opens the wrap and the seal, but the payload still needs his ML-KEM key.
  const alice = identity()
  const bob = identity()
  const other = identity()
  const wrap = wrapEvent(alice.sk, bob.pk, bob.pq.kem.publicKey, 'needs both halves')
  expect(() => unwrapEvent(wrap, bob.sk, other.pq.kem.secretKey)).toThrow(/decryption failed/)
})

test('rejects a rumor claiming an author the seal did not sign', () => {
  // Mallory builds a genuine post-quantum message whose rumor claims to be from alice.
  // Everything verifies cryptographically; only the author cross-check catches it.
  const alice = identity()
  const bob = identity()
  const mallory = identity()

  const rumor = {
    kind: 14,
    pubkey: alice.pk,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['p', bob.pk]],
    content: 'trust me, this is from alice',
  }
  const conv = getConversationKey(mallory.sk, bob.pk)
  const seal = finalizeEvent(
    {
      kind: Seal,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: encrypt(JSON.stringify(rumor), bob.pq.kem.publicKey, conv, {
        sender: mallory.pk,
        recipient: bob.pk,
      }),
    },
    mallory.sk,
  )
  const eph = generateSecretKey()
  const wrap = finalizeEvent(
    {
      kind: GiftWrap,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', bob.pk]],
      content: nip44Encrypt(JSON.stringify(seal), getConversationKey(eph, bob.pk)),
    },
    eph,
  )

  expect(() => unwrapEvent(wrap, bob.sk, bob.pq.kem.secretKey)).toThrow(/does not match seal/)
})

test('returns null for an ordinary NIP-17 gift wrap instead of throwing', () => {
  const alice = identity()
  const bob = identity()
  const conv = getConversationKey(alice.sk, bob.pk)
  const rumor = {
    kind: 14,
    pubkey: alice.pk,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['p', bob.pk]],
    content: 'a classic message',
  }
  const seal = finalizeEvent(
    { kind: Seal, created_at: Math.floor(Date.now() / 1000), tags: [], content: nip44Encrypt(JSON.stringify(rumor), conv) },
    alice.sk,
  )
  const eph = generateSecretKey()
  const wrap = finalizeEvent(
    {
      kind: GiftWrap,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', bob.pk]],
      content: nip44Encrypt(JSON.stringify(seal), getConversationKey(eph, bob.pk)),
    },
    eph,
  )
  expect(unwrapEvent(wrap, bob.sk, bob.pq.kem.secretKey)).toBeNull()
})

test('two sends of the same text are unlinkable', () => {
  const alice = identity()
  const bob = identity()
  const a = wrapEvent(alice.sk, bob.pk, bob.pq.kem.publicKey, 'identical')
  const b = wrapEvent(alice.sk, bob.pk, bob.pq.kem.publicKey, 'identical')
  expect(a.pubkey).not.toEqual(b.pubkey)
  expect(a.content).not.toEqual(b.content)
})
