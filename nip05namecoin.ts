/**
 * NIP-05 resolution for Namecoin `.bit` identifiers.
 *
 * Mirrors the shape of `./nip05.ts` so call sites can chain the two:
 *
 *   import * as namecoin from 'nostr-tools/nip05namecoin'
 *   import * as nip05 from 'nostr-tools/nip05'
 *
 *   const profile = namecoin.isValidIdentifier(input)
 *     ? await namecoin.queryProfile(input)
 *     : await nip05.queryProfile(input)
 *
 * Accepted identifier shapes:
 *
 *   - `alice@example.bit`
 *   - `example.bit`          (uses the `_` root entry)
 *   - `d/example`            (domain namespace)
 *   - `id/alice`             (identity namespace)
 *   - a `nostr:` NIP-21 URI prefix is tolerated
 *
 * Resolution walks the Namecoin blockchain via a public ElectrumX
 * server (WebSocket-over-TLS transport): finds the most recent
 * `name_update` transaction for `d/<domain>` or `id/<name>`, parses
 * its value JSON, and extracts the `nostr` field (either the simple
 * `"hex-pubkey"` form or the object `{names: {...}, relays: {...}}`
 * form used by Amethyst and the `.bit` NIP-05 spec draft).
 *
 * Ported from the Go reference at
 * https://github.com/mstrofnone/nostrlib-nip05-namecoin (itself a
 * port of the Kotlin implementation in Amethyst and the Swift port
 * in Nostur).
 *
 * # Transport notes
 *
 * This module speaks JSON-RPC over WSS to an ElectrumX server. By
 * default it uses the global `WebSocket` (native in browsers and
 * Node 22+). In Node you can plug in a different implementation via
 * `useWebSocketImplementation` — for example, the `ws` package
 * combined with a custom `tls` agent that pins the server's
 * self-signed certificate.
 *
 * The shipped {@link DEFAULT_ELECTRUMX_SERVERS} list points at the
 * two long-running public Namecoin ElectrumX operators, both of
 * which serve self-signed certs today. In a browser those will
 * therefore fail TLS until either operator switches to a CA-issued
 * cert or the caller provides a WebSocket implementation that
 * trusts the pinned cert.
 */

import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'

import { ProfilePointer } from './nip19.ts'

/** A pluggable WebSocket implementation. Must match the browser API. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WebSocketCtor = any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _WebSocket: WebSocketCtor
try {
  _WebSocket = WebSocket
} catch (_) {
  null
}

/**
 * Inject a WebSocket implementation. Useful in Node < 22, or when you
 * need to pin self-signed certs (pass `ws` constructed with a custom
 * `tls.Agent`, or a wrapper around it).
 */
export function useWebSocketImplementation(impl: WebSocketCtor): void {
  _WebSocket = impl
}

/** A single Namecoin ElectrumX endpoint. */
export type ElectrumXServer = {
  /** Hostname, e.g. `electrumx.testls.space`. */
  host: string
  /** Port, e.g. `50004` for the WSS endpoint. */
  port: number
  /** WSS path. Defaults to `/`. */
  path?: string
}

/**
 * Default list of Namecoin ElectrumX WSS endpoints, tried in order.
 *
 * Note: both operators serve **self-signed** TLS certificates as of
 * this writing. Browsers will refuse the handshake. In Node, supply
 * a WebSocket implementation (via {@link useWebSocketImplementation})
 * that trusts the pinned certs — see the README — or run your own
 * ElectrumX instance with a CA-issued cert.
 */
export const DEFAULT_ELECTRUMX_SERVERS: ElectrumXServer[] = [
  { host: 'electrumx.testls.space', port: 50004 },
  { host: 'nmc2.bitcoins.sk', port: 57004 },
  { host: '46.229.238.187', port: 57004 },
]

/** Blocks until a Namecoin name expires (~250 days). */
const NAME_EXPIRE_DEPTH = 36000

const HEX_PUBKEY_RE = /^[0-9a-fA-F]{64}$/

/**
 * Returns `true` when `identifier` should be routed to Namecoin
 * resolution instead of DNS-based NIP-05. Match targets:
 *
 * - `<anything>.bit`
 * - `alice@<anything>.bit`
 * - `d/<name>`
 * - `id/<name>`
 *
 * The match is intentionally cheap: callers use it as a front-door
 * check in hot paths.
 */
export function isValidIdentifier(identifier?: string | null): boolean {
  if (!identifier) return false
  let s = identifier.trim().toLowerCase()
  if (s.startsWith('nostr:')) s = s.slice(6)
  if (s.startsWith('d/') || s.startsWith('id/')) return true
  return s.endsWith('.bit')
}

/** Alias for {@link isValidIdentifier}. */
export const isDotBit = isValidIdentifier

type ParsedIdentifier = {
  /** The underlying Namecoin name, e.g. `d/example` or `id/alice`. */
  namecoinName: string
  /** The local-part within the name value, e.g. `alice` or `_`. */
  localPart: string
  /** True for `d/` names (domain + `names` map), false for `id/` names. */
  isDomain: boolean
}

function parseIdentifier(raw: string): ParsedIdentifier | null {
  let input = raw.trim()
  if (input.length >= 6 && input.slice(0, 6).toLowerCase() === 'nostr:') {
    input = input.slice(6)
  }
  const lower = input.toLowerCase()

  if (lower.startsWith('d/')) {
    return { namecoinName: lower, localPart: '_', isDomain: true }
  }
  if (lower.startsWith('id/')) {
    return { namecoinName: lower, localPart: '_', isDomain: false }
  }

  // user@domain.bit
  if (input.includes('@') && lower.endsWith('.bit')) {
    const atIdx = input.indexOf('@')
    const local = input.slice(0, atIdx).toLowerCase() || '_'
    const domain = input
      .slice(atIdx + 1)
      .toLowerCase()
      .replace(/\.bit$/, '')
    if (!domain) return null
    return { namecoinName: 'd/' + domain, localPart: local, isDomain: true }
  }

  // bare.bit
  if (lower.endsWith('.bit')) {
    const domain = lower.replace(/\.bit$/, '')
    if (!domain) return null
    return { namecoinName: 'd/' + domain, localPart: '_', isDomain: true }
  }

  return null
}

/**
 * Resolve a `.bit` / `d/` / `id/` identifier to a Nostr
 * {@link ProfilePointer}.
 *
 * Returns `null` if the identifier shape is invalid, the name is not
 * registered (or expired), the name value lacks a valid `nostr` field,
 * or every configured server failed to respond.
 *
 * Network errors and blockchain-level negatives are treated the same
 * (returning `null`) so that the signature matches
 * {@link queryProfile} from `./nip05.ts`.
 */
export async function queryProfile(
  identifier: string,
  servers: ElectrumXServer[] = DEFAULT_ELECTRUMX_SERVERS,
): Promise<ProfilePointer | null> {
  const parsed = parseIdentifier(identifier)
  if (!parsed) return null

  const valueJSON = await nameShowWithFallback(parsed.namecoinName, servers)
  if (!valueJSON) return null

  const extracted = extractNostrFromValue(valueJSON, parsed)
  if (!extracted) return null

  const { pubkey, relays } = extracted
  const pointer: ProfilePointer = { pubkey }
  if (relays && relays.length > 0) pointer.relays = relays
  return pointer
}

/**
 * Like `nip05.isValid` but for `.bit` identifiers. Returns `false` on
 * any lookup failure.
 */
export async function isValid(pubkey: string, identifier: string): Promise<boolean> {
  const res = await queryProfile(identifier)
  return res ? res.pubkey === pubkey : false
}

// ---------------------------------------------------------------------------
// ElectrumX transport (WSS)
// ---------------------------------------------------------------------------

/** Namecoin script opcodes used by the name-index script. */
const OP_NAME_UPDATE = 0x53 // OP_3, repurposed by Namecoin as OP_NAME_UPDATE
const OP_2DROP = 0x6d
const OP_DROP = 0x75
const OP_RETURN = 0x6a
const OP_PUSHDATA1 = 0x4c
const OP_PUSHDATA2 = 0x4d
const OP_PUSHDATA4 = 0x4e

const textEncoder = new TextEncoder()

/**
 * Try each server in order until one returns the raw JSON value for
 * `name`. Returns `null` if the name was definitively not found, and
 * also if every server errored out (we don't distinguish those in the
 * public API).
 */
async function nameShowWithFallback(name: string, servers: ElectrumXServer[]): Promise<string | null> {
  let foundDefinitiveMiss = false
  for (const srv of servers) {
    try {
      const val = await nameShow(name, srv)
      return val // may be null if server said "no such name"
    } catch (err) {
      if (err instanceof NameMissError) {
        foundDefinitiveMiss = true
        // Keep trying other servers: a definitive miss from one server
        // is only authoritative if they agree.
        continue
      }
      // Transport error — try next server.
    }
  }
  if (foundDefinitiveMiss) return null
  return null
}

class NameMissError extends Error {}

/**
 * Open a short-lived WSS connection, run the name_show flow, and
 * return the raw JSON value (the string stored against `name` on
 * chain), or `null` if the name is not registered / has expired.
 *
 * Throws on transport-level failures so the caller can try the next
 * server.
 */
async function nameShow(name: string, srv: ElectrumXServer): Promise<string | null> {
  if (!_WebSocket) {
    throw new Error(
      'nip05namecoin: no WebSocket implementation available. In Node < 22, call useWebSocketImplementation(impl).',
    )
  }

  const url = buildWSSUrl(srv)
  const rpc = new RPC(new _WebSocket(url))
  try {
    await rpc.opened

    // 1. Negotiate protocol version. Response discarded; we only
    //    care the socket is alive.
    await rpc.call('server.version', ['nostr-tools/nip05namecoin', '1.4'])

    // 2. Ask for the name's transaction history.
    const script = buildNameIndexScript(textEncoder.encode(name))
    const scriptHash = electrumScriptHash(script)
    const history = await rpc.call<Array<{ tx_hash: string; height: number }>>(
      'blockchain.scripthash.get_history',
      [scriptHash],
    )
    if (!history || history.length === 0) throw new NameMissError()
    const latest = history[history.length - 1]

    // 3. Fetch the full (verbose) transaction.
    const tx = await rpc.call<{ vout: Array<{ scriptPubKey?: { hex?: string } }> }>(
      'blockchain.transaction.get',
      [latest.tx_hash, true],
    )

    // 4. Get current block height for expiry check.
    let currentHeight = 0
    try {
      const header = await rpc.call<{ height?: number }>('blockchain.headers.subscribe', [])
      if (header && typeof header.height === 'number') currentHeight = header.height
    } catch {
      // Non-fatal: just skip the expiry check.
    }

    if (currentHeight > 0 && latest.height > 0 && currentHeight - latest.height >= NAME_EXPIRE_DEPTH) {
      // Expired — treat as a miss.
      return null
    }

    return extractNameValue(tx.vout, name)
  } finally {
    rpc.close()
  }
}

function buildWSSUrl(srv: ElectrumXServer): string {
  const path = srv.path ?? '/'
  return `wss://${srv.host}:${srv.port}${path.startsWith('/') ? path : '/' + path}`
}

/** Minimal JSON-RPC-2.0 over WebSocket, one in-flight call at a time. */
class RPC {
  opened: Promise<void>
  private ws: WebSocket
  private id = 0
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()

  constructor(ws: WebSocket) {
    this.ws = ws
    this.opened = new Promise((resolve, reject) => {
      ws.addEventListener('open', () => resolve())
      ws.addEventListener('error', () => reject(new Error('websocket error')))
      ws.addEventListener('close', () => {
        // Reject any outstanding calls.
        for (const p of this.pending.values()) p.reject(new Error('websocket closed'))
        this.pending.clear()
      })
    })
    ws.addEventListener('message', ev => this.onMessage(ev))
  }

  async call<T = unknown>(method: string, params: unknown[]): Promise<T> {
    const id = ++this.id
    const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params })
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: v => resolve(v as T), reject })
      try {
        this.ws.send(msg)
      } catch (e) {
        this.pending.delete(id)
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    })
  }

  private onMessage(ev: MessageEvent): void {
    let parsed: { id?: number; result?: unknown; error?: unknown }
    try {
      const data = typeof ev.data === 'string' ? ev.data : new TextDecoder().decode(ev.data as ArrayBuffer)
      parsed = JSON.parse(data)
    } catch {
      return
    }
    if (typeof parsed.id !== 'number') return
    const p = this.pending.get(parsed.id)
    if (!p) return
    this.pending.delete(parsed.id)
    if (parsed.error) {
      p.reject(new Error(typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error)))
    } else {
      p.resolve(parsed.result)
    }
  }

  close(): void {
    try {
      this.ws.close()
    } catch {
      // ignore
    }
  }
}

// ---------------------------------------------------------------------------
// Namecoin script: build index script, parse NAME_UPDATE vout
// ---------------------------------------------------------------------------

/**
 * Build the canonical script used by the Namecoin ElectrumX fork to
 * index names on-chain:
 *
 *   OP_NAME_UPDATE <push(name)> <push(empty)> OP_2DROP OP_DROP OP_RETURN
 *
 * The SHA-256 of this script (reversed, hex-encoded) is the scripthash
 * queried via `blockchain.scripthash.get_history`.
 */
function buildNameIndexScript(nameBytes: Uint8Array): Uint8Array {
  const parts: number[] = []
  parts.push(OP_NAME_UPDATE)
  pushData(parts, nameBytes)
  pushData(parts, new Uint8Array(0))
  parts.push(OP_2DROP, OP_DROP, OP_RETURN)
  return new Uint8Array(parts)
}

function pushData(out: number[], data: Uint8Array): void {
  const n = data.length
  if (n < OP_PUSHDATA1) {
    out.push(n)
  } else if (n <= 0xff) {
    out.push(OP_PUSHDATA1, n)
  } else {
    out.push(OP_PUSHDATA2, n & 0xff, (n >> 8) & 0xff)
  }
  for (let i = 0; i < n; i++) out.push(data[i])
}

/** SHA-256 of `script`, byte-reversed, hex-encoded. */
function electrumScriptHash(script: Uint8Array): string {
  const digest = sha256(script)
  const reversed = new Uint8Array(digest.length)
  for (let i = 0; i < digest.length; i++) reversed[i] = digest[digest.length - 1 - i]
  return bytesToHex(reversed)
}

/** Walk vouts looking for a NAME_UPDATE that matches `name`. */
function extractNameValue(vouts: Array<{ scriptPubKey?: { hex?: string } }>, name: string): string | null {
  for (const vout of vouts || []) {
    const hex = vout?.scriptPubKey?.hex
    if (!hex || !hex.startsWith('53')) continue // not a NAME_UPDATE
    let bytes: Uint8Array
    try {
      bytes = hexToBytes(hex)
    } catch {
      continue
    }
    const parsed = parseNameScript(bytes)
    if (!parsed) continue
    if (parsed.name === name) return parsed.value
  }
  return null
}

/** Parse a NAME_UPDATE output script. */
function parseNameScript(script: Uint8Array): { name: string; value: string } | null {
  if (script.length === 0 || script[0] !== OP_NAME_UPDATE) return null
  let pos = 1
  const nameRead = readPushData(script, pos)
  if (!nameRead) return null
  pos = nameRead.next
  const valueRead = readPushData(script, pos)
  if (!valueRead) return null
  const decoder = new TextDecoder('utf-8', { fatal: false })
  return {
    name: decoder.decode(nameRead.data),
    value: decoder.decode(valueRead.data),
  }
}

function readPushData(script: Uint8Array, pos: number): { data: Uint8Array; next: number } | null {
  if (pos >= script.length) return null
  const op = script[pos]

  if (op === 0x00) {
    return { data: new Uint8Array(0), next: pos + 1 }
  }
  if (op < OP_PUSHDATA1) {
    const length = op
    const end = pos + 1 + length
    if (end > script.length) return null
    return { data: script.slice(pos + 1, end), next: end }
  }
  if (op === OP_PUSHDATA1) {
    if (pos + 2 > script.length) return null
    const length = script[pos + 1]
    const end = pos + 2 + length
    if (end > script.length) return null
    return { data: script.slice(pos + 2, end), next: end }
  }
  if (op === OP_PUSHDATA2) {
    if (pos + 3 > script.length) return null
    const length = script[pos + 1] | (script[pos + 2] << 8)
    const end = pos + 3 + length
    if (end > script.length) return null
    return { data: script.slice(pos + 3, end), next: end }
  }
  if (op === OP_PUSHDATA4) {
    if (pos + 5 > script.length) return null
    const length =
      script[pos + 1] |
      (script[pos + 2] << 8) |
      (script[pos + 3] << 16) |
      (script[pos + 4] << 24)
    const end = pos + 5 + length
    if (end < 0 || end > script.length) return null
    return { data: script.slice(pos + 5, end), next: end }
  }
  return null
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('hex: odd length')
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    const b = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    if (Number.isNaN(b)) throw new Error('hex: invalid byte')
    out[i] = b
  }
  return out
}

// ---------------------------------------------------------------------------
// JSON value extraction
// ---------------------------------------------------------------------------

/**
 * Pull the `nostr` pubkey and optional relay list out of a Namecoin
 * name value. Supports the simple `"nostr": "hex"` form and the
 * extended `"nostr": { "names": {...}, "relays": {...} }` form used
 * by Amethyst.
 *
 * Returns `null` if no valid pubkey matches the requested local-part.
 */
export function extractNostrFromValue(
  valueJSON: string,
  parsed: ParsedIdentifier,
): { pubkey: string; relays?: string[] } | null {
  let root: Record<string, unknown>
  try {
    root = JSON.parse(valueJSON) as Record<string, unknown>
  } catch {
    return null
  }
  if (typeof root !== 'object' || root === null) return null

  const nostrField = root['nostr']
  if (nostrField === undefined || nostrField === null) return null

  // Simple form: "nostr": "hex-pubkey"
  if (typeof nostrField === 'string') {
    if (parsed.isDomain && parsed.localPart !== '_') return null
    if (!HEX_PUBKEY_RE.test(nostrField)) return null
    return { pubkey: nostrField.toLowerCase() }
  }

  // Extended form: object with "names" and optional "relays".
  if (typeof nostrField !== 'object') return null
  const obj = nostrField as Record<string, unknown>

  if (parsed.isDomain) {
    return extractFromDomainNamesObject(obj, parsed)
  }
  return extractFromIdentityObject(obj, parsed)
}

function extractFromDomainNamesObject(
  obj: Record<string, unknown>,
  parsed: ParsedIdentifier,
): { pubkey: string; relays?: string[] } | null {
  const names = obj['names']
  if (typeof names !== 'object' || names === null) return null
  const namesMap = names as Record<string, unknown>

  let pickedPubkey: string | null = null

  const exact = namesMap[parsed.localPart]
  if (typeof exact === 'string' && HEX_PUBKEY_RE.test(exact)) {
    pickedPubkey = exact
  } else {
    const underscore = namesMap['_']
    if (typeof underscore === 'string' && HEX_PUBKEY_RE.test(underscore)) {
      pickedPubkey = underscore
    } else if (parsed.localPart === '_') {
      for (const v of Object.values(namesMap)) {
        if (typeof v === 'string' && HEX_PUBKEY_RE.test(v)) {
          pickedPubkey = v
          break
        }
      }
    }
  }

  if (!pickedPubkey) return null
  const relays = extractRelays(obj, pickedPubkey)
  return relays ? { pubkey: pickedPubkey.toLowerCase(), relays } : { pubkey: pickedPubkey.toLowerCase() }
}

function extractFromIdentityObject(
  obj: Record<string, unknown>,
  _parsed: ParsedIdentifier,
): { pubkey: string; relays?: string[] } | null {
  // Try "pubkey" field first (id/ shape).
  const pk = obj['pubkey']
  if (typeof pk === 'string' && HEX_PUBKEY_RE.test(pk)) {
    const relaysRaw = obj['relays']
    if (Array.isArray(relaysRaw)) {
      const relays = relaysRaw.filter((r): r is string => typeof r === 'string')
      return relays.length > 0 ? { pubkey: pk.toLowerCase(), relays } : { pubkey: pk.toLowerCase() }
    }
    return { pubkey: pk.toLowerCase() }
  }

  // Fall back to NIP-05-like "names" with "_" root.
  const names = obj['names']
  if (typeof names === 'object' && names !== null) {
    const underscore = (names as Record<string, unknown>)['_']
    if (typeof underscore === 'string' && HEX_PUBKEY_RE.test(underscore)) {
      const relays = extractRelays(obj, underscore)
      return relays
        ? { pubkey: underscore.toLowerCase(), relays }
        : { pubkey: underscore.toLowerCase() }
    }
  }

  return null
}

function extractRelays(obj: Record<string, unknown>, pubkey: string): string[] | null {
  const raw = obj['relays']
  if (typeof raw !== 'object' || raw === null) return null
  const map = raw as Record<string, unknown>
  const candidate = map[pubkey.toLowerCase()] ?? map[pubkey]
  if (!Array.isArray(candidate)) return null
  const relays = candidate.filter((r): r is string => typeof r === 'string')
  return relays.length > 0 ? relays : null
}
