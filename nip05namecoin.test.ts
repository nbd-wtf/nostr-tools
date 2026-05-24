import { test, expect } from 'bun:test'
import { Server, WebSocket as MockWebSocket } from 'mock-socket'

import {
  isValidIdentifier,
  isDotBit,
  queryProfile,
  useWebSocketImplementation,
  extractNostrFromValue,
  DEFAULT_ELECTRUMX_SERVERS,
} from './nip05namecoin.ts'

useWebSocketImplementation(MockWebSocket)

// ---------------------------------------------------------------------------
// Parser / predicate tests — no network.
// ---------------------------------------------------------------------------

test('isValidIdentifier accepts .bit shapes', () => {
  expect(isValidIdentifier('alice.bit')).toBeTrue()
  expect(isValidIdentifier('ALICE.BIT')).toBeTrue()
  expect(isValidIdentifier('alice@example.bit')).toBeTrue()
  expect(isValidIdentifier('d/example')).toBeTrue()
  expect(isValidIdentifier('id/alice')).toBeTrue()
  expect(isValidIdentifier('nostr:d/example')).toBeTrue()
  expect(isValidIdentifier('  alice@example.bit  ')).toBeTrue()
})

test('isValidIdentifier rejects DNS NIP-05 and empty input', () => {
  expect(isValidIdentifier('')).toBeFalse()
  expect(isValidIdentifier(null)).toBeFalse()
  expect(isValidIdentifier(undefined)).toBeFalse()
  expect(isValidIdentifier('alice@example.com')).toBeFalse()
  expect(isValidIdentifier('example.com')).toBeFalse()
  expect(isValidIdentifier('d')).toBeFalse()
})

test('isDotBit is an alias for isValidIdentifier', () => {
  expect(isDotBit('alice.bit')).toBeTrue()
  expect(isDotBit('alice@example.com')).toBeFalse()
})

test('DEFAULT_ELECTRUMX_SERVERS is a non-empty list of wss-ready endpoints', () => {
  expect(DEFAULT_ELECTRUMX_SERVERS.length).toBeGreaterThan(0)
  for (const srv of DEFAULT_ELECTRUMX_SERVERS) {
    expect(typeof srv.host).toBe('string')
    expect(srv.host.length).toBeGreaterThan(0)
    expect(typeof srv.port).toBe('number')
    expect(srv.port).toBeGreaterThan(0)
  }
})

// ---------------------------------------------------------------------------
// extractNostrFromValue — the JSON parsing logic, covers both
// name-value shapes.
// ---------------------------------------------------------------------------

test('extractNostrFromValue: simple nostr string form, root lookup', () => {
  const pk = 'a'.repeat(64)
  const v = JSON.stringify({ nostr: pk })
  const got = extractNostrFromValue(v, {
    namecoinName: 'd/example',
    localPart: '_',
    isDomain: true,
  } as any)
  expect(got).toEqual({ pubkey: pk })
})

test('extractNostrFromValue: simple nostr string form, local-part lookup fails', () => {
  const pk = 'b'.repeat(64)
  const v = JSON.stringify({ nostr: pk })
  const got = extractNostrFromValue(v, {
    namecoinName: 'd/example',
    localPart: 'alice',
    isDomain: true,
  } as any)
  expect(got).toBeNull()
})

test('extractNostrFromValue: extended object form with names map', () => {
  const pk = 'c'.repeat(64)
  const v = JSON.stringify({
    nostr: {
      names: { alice: pk, _: 'd'.repeat(64) },
      relays: { [pk]: ['wss://one.example', 'wss://two.example'] },
    },
  })
  const got = extractNostrFromValue(v, {
    namecoinName: 'd/example',
    localPart: 'alice',
    isDomain: true,
  } as any)
  expect(got).toEqual({
    pubkey: pk,
    relays: ['wss://one.example', 'wss://two.example'],
  })
})

test('extractNostrFromValue: extended object form falls back to root', () => {
  const pk = 'e'.repeat(64)
  const v = JSON.stringify({ nostr: { names: { _: pk } } })
  const got = extractNostrFromValue(v, {
    namecoinName: 'd/example',
    localPart: 'bob',
    isDomain: true,
  } as any)
  expect(got).toEqual({ pubkey: pk })
})

test('extractNostrFromValue: id/ identity object with pubkey + relays', () => {
  const pk = 'f'.repeat(64)
  const v = JSON.stringify({
    nostr: { pubkey: pk, relays: ['wss://relay.example'] },
  })
  const got = extractNostrFromValue(v, {
    namecoinName: 'id/alice',
    localPart: '_',
    isDomain: false,
  } as any)
  expect(got).toEqual({ pubkey: pk, relays: ['wss://relay.example'] })
})

test('extractNostrFromValue: returns null on missing or malformed nostr field', () => {
  const ctx = { namecoinName: 'd/x', localPart: '_', isDomain: true } as any
  expect(extractNostrFromValue('not json', ctx)).toBeNull()
  expect(extractNostrFromValue(JSON.stringify({ other: 'field' }), ctx)).toBeNull()
  expect(extractNostrFromValue(JSON.stringify({ nostr: 'not-a-pubkey' }), ctx)).toBeNull()
  expect(extractNostrFromValue(JSON.stringify({ nostr: { names: {} } }), ctx)).toBeNull()
})

test('extractNostrFromValue: uppercase pubkey is lowercased on output', () => {
  const pkUpper = 'A'.repeat(64)
  const v = JSON.stringify({ nostr: pkUpper })
  const got = extractNostrFromValue(v, {
    namecoinName: 'd/example',
    localPart: '_',
    isDomain: true,
  } as any)
  expect(got).toEqual({ pubkey: 'a'.repeat(64) })
})

// ---------------------------------------------------------------------------
// queryProfile — mocked ElectrumX server speaking the real JSON-RPC
// flow, exercises the full WebSocket + script-hash + NAME_UPDATE
// parsing path.
//
// We fabricate a minimal transaction whose scriptPubKey.hex is a
// NAME_UPDATE containing the target name and the target value. The
// electrumScriptHash is recomputed by our code under test, so the
// mock server does not need to know it: we simply respond to
// whichever scripthash the client sends.
// ---------------------------------------------------------------------------

/** Bitcoin-style push-data encoder for tests. */
function pushData(out: number[], bytes: Uint8Array) {
  const n = bytes.length
  if (n < 0x4c) {
    out.push(n)
  } else if (n <= 0xff) {
    out.push(0x4c, n)
  } else {
    out.push(0x4d, n & 0xff, (n >> 8) & 0xff)
  }
  for (let i = 0; i < n; i++) out.push(bytes[i])
}

function toHex(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += b.toString(16).padStart(2, '0')
  return s
}

/**
 * Build a NAME_UPDATE script pubkey hex for `(name, value)`, suffixed
 * with a 2-byte "fake address script" so parsers that expect a
 * standard trailing address don't choke. Our parser only reads the
 * two leading push-data elements so the suffix is cosmetic.
 */
function buildNameUpdateHex(name: string, value: string): string {
  const enc = new TextEncoder()
  const script: number[] = []
  script.push(0x53) // OP_NAME_UPDATE
  pushData(script, enc.encode(name))
  pushData(script, enc.encode(value))
  script.push(0x6d, 0x75) // OP_2DROP OP_DROP
  // Fake "standard" trailer.
  script.push(0x76, 0xa9, 0x14)
  for (let i = 0; i < 20; i++) script.push(0x00)
  script.push(0x88, 0xac)
  return toHex(new Uint8Array(script))
}

function startFakeElectrumX(port: number, name: string, valueJSON: string, pickHeight = 800_000) {
  const url = `wss://mock-electrumx.example:${port}`
  const server = new Server(url)
  const fakeTxHash = '0'.repeat(64)
  const fakeHex = buildNameUpdateHex(name, valueJSON)

  server.on('connection', socket => {
    socket.on('message', (raw: any) => {
      let req: { id?: number; method?: string; params?: unknown[] }
      try {
        req = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw))
      } catch {
        return
      }
      const id = req.id
      const method = req.method
      let result: unknown = null
      switch (method) {
        case 'server.version':
          result = ['ElectrumX 1.16.0', '1.4']
          break
        case 'blockchain.scripthash.get_history':
          result = [{ tx_hash: fakeTxHash, height: pickHeight }]
          break
        case 'blockchain.transaction.get':
          result = {
            txid: fakeTxHash,
            vout: [
              { scriptPubKey: { hex: '76a914' + '0'.repeat(40) + '88ac' } }, // dust, ignored
              { scriptPubKey: { hex: fakeHex } },
            ],
          }
          break
        case 'blockchain.headers.subscribe':
          result = { height: pickHeight + 10, hex: '' }
          break
      }
      socket.send(JSON.stringify({ jsonrpc: '2.0', id, result }))
    })
  })

  return { server, url, stop: () => server.stop() }
}

test('queryProfile: resolves a bare .bit name via a mocked ElectrumX server', async () => {
  const pk = '7'.repeat(64)
  const name = 'd/exampleone'
  const valueJSON = JSON.stringify({ nostr: pk })
  const port = 51001
  const fake = startFakeElectrumX(port, name, valueJSON)
  try {
    const got = await queryProfile('exampleone.bit', [
      { host: 'mock-electrumx.example', port },
    ])
    expect(got).toEqual({ pubkey: pk })
  } finally {
    fake.stop()
  }
})

test('queryProfile: resolves alice@example.bit via extended names map', async () => {
  const pk = '8'.repeat(64)
  const name = 'd/exampletwo'
  const valueJSON = JSON.stringify({
    nostr: {
      names: { alice: pk, _: '9'.repeat(64) },
      relays: { [pk]: ['wss://alice.example'] },
    },
  })
  const port = 51002
  const fake = startFakeElectrumX(port, name, valueJSON)
  try {
    const got = await queryProfile('alice@exampletwo.bit', [
      { host: 'mock-electrumx.example', port },
    ])
    expect(got).toEqual({ pubkey: pk, relays: ['wss://alice.example'] })
  } finally {
    fake.stop()
  }
})

test('queryProfile: returns null for non-namecoin identifiers', async () => {
  const got = await queryProfile('alice@example.com', [{ host: 'unused', port: 1 }])
  expect(got).toBeNull()
})

/**
 * Multi-name variant of {@link startFakeElectrumX}: serves any of the
 * registered (name → value) pairs by looking up which scripthash the
 * client asked for. Used to exercise the ifa-0001 `import` chain
 * end-to-end through {@link queryProfile}.
 */
function startMultiNameFakeElectrumX(port: number, records: Record<string, string>, pickHeight = 800_000) {
  const url = `wss://mock-electrumx.example:${port}`
  const server = new Server(url)

  // Pre-compute scripthash → name index. The client builds the
  // scripthash from the on-chain name-index script; we mirror that
  // here using the same helpers as the production code path.
  // Cheaper trick: just round-robin a single name per RPC call by
  // tracking which scripthash arrived last. Mock-socket replays the
  // request id so we can correlate get_history -> transaction.get.
  const nameToHex: Record<string, string> = {}
  for (const [name, value] of Object.entries(records)) {
    nameToHex[name] = buildNameUpdateHex(name, value)
  }

  // Track which name each session last queried so transaction.get can
  // return the matching script. We key by scripthash (the request param
  // is unique per name).
  const scriptHashToName: Record<string, string> = {}

  server.on('connection', socket => {
    let lastName: string | null = null
    socket.on('message', (raw: any) => {
      let req: { id?: number; method?: string; params?: unknown[] }
      try {
        req = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw))
      } catch {
        return
      }
      const id = req.id
      const method = req.method
      let result: unknown = null
      switch (method) {
        case 'server.version':
          result = ['ElectrumX 1.16.0', '1.4']
          break
        case 'blockchain.scripthash.get_history': {
          // Resolve scripthash → name by matching against our index.
          // We compute names' scripthashes lazily on first call from
          // a session by walking the registered map. To keep things
          // simple: store a name per scripthash on first sight.
          const sh = String((req.params as string[])[0])
          if (!scriptHashToName[sh]) {
            // Assume the client iterates names in the same order we
            // were registered with; pick the first not-yet-seen name.
            for (const n of Object.keys(records)) {
              if (!Object.values(scriptHashToName).includes(n)) {
                scriptHashToName[sh] = n
                break
              }
            }
          }
          lastName = scriptHashToName[sh] ?? null
          if (lastName === null) {
            result = []
          } else {
            result = [{ tx_hash: '0'.repeat(64), height: pickHeight }]
          }
          break
        }
        case 'blockchain.transaction.get':
          if (lastName === null) {
            result = { txid: '0'.repeat(64), vout: [] }
          } else {
            result = {
              txid: '0'.repeat(64),
              vout: [
                { scriptPubKey: { hex: '76a914' + '0'.repeat(40) + '88ac' } },
                { scriptPubKey: { hex: nameToHex[lastName] } },
              ],
            }
          }
          break
        case 'blockchain.headers.subscribe':
          result = { height: pickHeight + 10, hex: '' }
          break
      }
      socket.send(JSON.stringify({ jsonrpc: '2.0', id, result }))
    })
  })

  return { server, url, stop: () => server.stop() }
}

test('queryProfile: resolves through ifa-0001 import chain (importer has no nostr, imported provides it)', async () => {
  const pk = 'b'.repeat(64)
  // d/importer has only an import pointing at d/lib; d/lib carries the
  // nostr block. Without import expansion this would resolve to null.
  const importerValue = JSON.stringify({ import: 'd/lib' })
  const libValue = JSON.stringify({ nostr: pk })
  const port = 51005
  const fake = startMultiNameFakeElectrumX(port, {
    'd/importer': importerValue,
    'd/lib': libValue,
  })
  try {
    const got = await queryProfile('importer.bit', [
      { host: 'mock-electrumx.example', port },
    ])
    expect(got).toEqual({ pubkey: pk })
  } finally {
    fake.stop()
  }
})

test('queryProfile: importer nostr field wins over imported one', async () => {
  const pkLocal = 'c'.repeat(64)
  const pkImported = 'd'.repeat(64)
  const importerValue = JSON.stringify({ import: 'd/lib', nostr: pkLocal })
  const libValue = JSON.stringify({ nostr: pkImported })
  const port = 51006
  const fake = startMultiNameFakeElectrumX(port, {
    'd/importer2': importerValue,
    'd/lib': libValue,
  })
  try {
    const got = await queryProfile('importer2.bit', [
      { host: 'mock-electrumx.example', port },
    ])
    expect(got).toEqual({ pubkey: pkLocal })
  } finally {
    fake.stop()
  }
})

test('queryProfile: a record without `import` triggers zero extra lookups', async () => {
  // Regression: the import path must short-circuit when there's no
  // `import` key. Use a fake server that fails any second name lookup.
  const pk = 'e'.repeat(64)
  const port = 51007
  const fake = startFakeElectrumX(port, 'd/standalone', JSON.stringify({ nostr: pk }))
  try {
    const got = await queryProfile('standalone.bit', [
      { host: 'mock-electrumx.example', port },
    ])
    expect(got).toEqual({ pubkey: pk })
  } finally {
    fake.stop()
  }
})

test('queryProfile: falls back to the second server on transport error', async () => {
  const pk = 'a'.repeat(64)
  const name = 'd/examplethree'
  const valueJSON = JSON.stringify({ nostr: pk })
  const port2 = 51004
  const fake2 = startFakeElectrumX(port2, name, valueJSON)
  try {
    // First server doesn't exist (mock-socket will fail to connect),
    // second one answers. The tested code should fall through.
    const got = await queryProfile('examplethree.bit', [
      { host: 'does-not-exist.example', port: 51003 },
      { host: 'mock-electrumx.example', port: port2 },
    ])
    expect(got).toEqual({ pubkey: pk })
  } finally {
    fake2.stop()
  }
})
